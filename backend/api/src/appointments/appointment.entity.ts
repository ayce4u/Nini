import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Provider } from '../providers/provider.entity.js';
import { User } from '../users/user.entity.js';
import { ProviderService } from '../providers/provider-service.entity.js';

export type AppointmentStatus =
  | 'pending' // demandé par le client, en attente du prestataire
  | 'confirmed' // accepté
  | 'declined' // refusé par le prestataire
  | 'cancelled' // annulé par le client ou le prestataire
  | 'completed' // terminé (compte dans le chiffre d'affaires)
  | 'no_show'; // le client n'est pas venu

/** Statuts qui bloquent le créneau dans le planning. */
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'completed',
];

@Entity('appointments')
@Index(['providerId', 'startsAt'])
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  provider: Relation<Provider>;

  @Column()
  providerId: string;

  /** Vide quand le prestataire ajoute lui-même un rendez-vous pris par téléphone. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  client: Relation<User> | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  /** Nom et numéro du client pour les rendez-vous ajoutés à la main. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  clientName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  clientPhone: string | null;

  @ManyToOne(() => ProviderService, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  service: Relation<ProviderService> | null;

  @Column({ type: 'uuid', nullable: true })
  serviceId: string | null;

  /** Nom du service au moment de la réservation (reste lisible si le service change). */
  @Column({ length: 120 })
  serviceName: string;

  @Column({ type: 'integer' })
  priceFcfa: number;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 12, default: 'pending' })
  status: AppointmentStatus;

  /** "app" (réservé par le client) ou "manual" (ajouté par le prestataire). */
  @Column({ type: 'varchar', length: 8, default: 'app' })
  source: 'app' | 'manual';

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Adresse du client quand le prestataire se déplace. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
