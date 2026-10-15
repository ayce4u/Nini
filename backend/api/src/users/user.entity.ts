import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import type { Role } from '../common/roles.js';
import { Provider } from '../providers/provider.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  firstName: string;

  @Column({ length: 80 })
  lastName: string;

  /** Numéro au format international, ex. +22376123456. C'est l'identifiant de connexion. */
  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 12, default: 'client' })
  role: Role;

  @Column({ type: 'varchar', length: 80, nullable: true })
  quartier: string | null;

  @Column({ length: 80, default: 'Bamako' })
  city: string;

  /** Jeton de l'iPhone pour les notifications (Apple Push). */
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  pushToken: string | null;

  @OneToOne(() => Provider, (p) => p.user)
  provider?: Relation<Provider>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
