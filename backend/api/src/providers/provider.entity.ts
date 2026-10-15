import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Category } from '../categories/category.entity.js';
import { DEFAULT_WEEKLY_HOURS, type WeeklyHours } from '../common/time.js';
import { ProviderService } from './provider-service.entity.js';
import { ProviderPhoto } from './provider-photo.entity.js';

/** Un point GPS au format GeoJSON, tel que PostGIS le renvoie. */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (u) => u.provider, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<User>;

  @Column()
  userId: string;

  @Column({ length: 120 })
  businessName: string;

  @ManyToOne(() => Category, { eager: true })
  @JoinColumn({ name: 'categorySlug' })
  category: Relation<Category>;

  @Column({ length: 40 })
  categorySlug: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  quartier: string | null;

  @Column({ length: 80, default: 'Bamako' })
  city: string;

  /** Repère pour trouver le lieu : « en face de la pharmacie… ». */
  @Column({ type: 'varchar', length: 200, nullable: true })
  landmark: string | null;

  /** Position GPS du lieu de travail. Index spatial pour chercher les plus proches. */
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: GeoPoint | null;

  /** Le prestataire se déplace chez le client. */
  @Column({ default: false })
  mobile: boolean;

  /** Numéro WhatsApp s'il est différent du numéro de téléphone. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsapp: string | null;

  @Column({
    type: 'jsonb',
    default: () => `'${JSON.stringify(DEFAULT_WEEKLY_HOURS)}'`,
  })
  weeklyHours: WeeklyHours;

  /** Durée entre deux créneaux proposés aux clients, en minutes. */
  @Column({ default: 30 })
  slotStepMinutes: number;

  @Column({ default: false })
  verified: boolean;

  /** Visible dans la recherche une fois le profil complété. */
  @Column({ default: true })
  published: boolean;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  ratingAvg: number;

  @Column({ default: 0 })
  ratingCount: number;

  /** Code de parrainage personnel, à partager avec d'autres prestataires. */
  @Column({ unique: true, length: 12 })
  referralCode: string;

  @Column({ type: 'varchar', length: 12, nullable: true })
  referredBy: string | null;

  /** Lien secret d'un agenda Google (format iCal) à importer. */
  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  calendarImportUrl: string | null;

  /** Jeton secret pour l'abonnement à l'agenda depuis Google Agenda. */
  @Column({ length: 40, select: false })
  calendarToken: string;

  @OneToMany(() => ProviderService, (s) => s.provider)
  services: Relation<ProviderService[]>;

  @OneToMany(() => ProviderPhoto, (p) => p.provider)
  photos: Relation<ProviderPhoto[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
