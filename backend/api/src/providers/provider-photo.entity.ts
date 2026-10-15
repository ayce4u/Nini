import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Provider } from './provider.entity.js';

/** Photo de travaux ou photo de profil, rangée dans MinIO. */
@Entity('provider_photos')
export class ProviderPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, (p) => p.photos, { onDelete: 'CASCADE' })
  provider: Relation<Provider>;

  @Column()
  providerId: string;

  /** Nom du fichier dans le stockage, ex. "providers/<id>/<uuid>.webp". */
  @Column({ length: 200 })
  key: string;

  @Column({ default: false })
  isCover: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
