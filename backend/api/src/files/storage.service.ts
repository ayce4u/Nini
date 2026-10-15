import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import type { Readable } from 'node:stream';

/**
 * Range les photos sur le disque du serveur, dans un dossier monté comme
 * volume Docker (il survit aux mises à jour de l'app et fait partie des
 * sauvegardes). Chaque photo est réduite et convertie en WebP pour rester
 * légère sur une connexion lente.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly root: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.root = config.get('UPLOAD_DIR', join(process.cwd(), 'uploads'));
    this.publicUrl = config
      .get('PUBLIC_API_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  async onModuleInit() {
    await mkdir(this.root, { recursive: true });
  }

  /** Adresse publique d'un fichier, servie par l'API. */
  url(key: string | null | undefined): string | null {
    return key ? `${this.publicUrl}/files/${key}` : null;
  }

  async savePhoto(folder: string, input: Buffer): Promise<string> {
    const image = await sharp(input)
      .rotate() // respecte l'orientation de la photo prise au téléphone
      .resize({
        width: 1280,
        height: 1280,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer();
    const key = `${folder}/${randomUUID()}.webp`;
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, image);
    return key;
  }

  async read(
    key: string,
  ): Promise<{ stream: Readable; contentType: string; size: number }> {
    const path = this.pathOf(key);
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) throw new NotFoundException('Fichier introuvable.');
    return {
      stream: createReadStream(path),
      contentType: key.endsWith('.webp')
        ? 'image/webp'
        : 'application/octet-stream',
      size: info.size,
    };
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  /** Empêche de sortir du dossier des photos avec un nom comme "../../etc/passwd". */
  private pathOf(key: string): string {
    const path = normalize(join(this.root, key));
    if (!path.startsWith(this.root + sep))
      throw new NotFoundException('Fichier introuvable.');
    return path;
  }
}
