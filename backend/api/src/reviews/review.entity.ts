import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Provider } from '../providers/provider.entity.js';
import { User } from '../users/user.entity.js';
import { Appointment } from '../appointments/appointment.entity.js';

/** Un avis n'est possible qu'après un rendez-vous terminé : un avis par rendez-vous. */
@Entity('reviews')
@Index(['providerId', 'createdAt'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn()
  appointment: Relation<Appointment>;

  @Column({ unique: true })
  appointmentId: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  provider: Relation<Provider>;

  @Column()
  providerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  client: Relation<User>;

  @Column()
  clientId: string;

  /** De 1 à 5 étoiles. */
  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', default: '' })
  comment: string;

  /** Réponse publique du prestataire. */
  @Column({ type: 'text', nullable: true })
  reply: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
