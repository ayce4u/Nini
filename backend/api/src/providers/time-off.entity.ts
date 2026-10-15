import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Provider } from './provider.entity.js';

/** Période où le prestataire n'est pas disponible : congé, pause, ou rendez-vous importé de Google Agenda. */
@Entity('time_offs')
@Index(['providerId', 'startsAt'])
export class TimeOff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  provider: Relation<Provider>;

  @Column()
  providerId: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 160, nullable: true })
  reason: string | null;

  /** "manual" (ajouté dans l'app) ou "calendar" (importé d'un agenda). */
  @Column({ type: 'varchar', length: 12, default: 'manual' })
  source: 'manual' | 'calendar';
}
