import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Provider } from './provider.entity.js';

/** Une prestation proposée : « Tresses africaines », 15 000 FCFA, 180 minutes. */
@Entity('provider_services')
export class ProviderService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Provider, (p) => p.services, { onDelete: 'CASCADE' })
  provider: Relation<Provider>;

  @Column()
  providerId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  /** Prix en francs CFA (pas de centimes). */
  @Column({ type: 'integer' })
  priceFcfa: number;

  /** Le prix est un minimum (« à partir de »). */
  @Column({ default: false })
  priceFrom: boolean;

  @Column({ type: 'integer', default: 60 })
  durationMinutes: number;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 0 })
  sortOrder: number;
}
