import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/roles.js';
import { StorageService } from './storage.service.js';

@ApiExcludeController()
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('*key')
  async get(@Param('key') key: string | string[], @Res() res: Response) {
    const path = Array.isArray(key) ? key.join('/') : key;
    const file = await this.storage.read(path);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', String(file.size));
    // Les noms de fichiers sont uniques : le navigateur peut garder l'image longtemps.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    file.stream.pipe(res);
  }
}
