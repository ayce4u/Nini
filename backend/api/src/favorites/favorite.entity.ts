import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Provider } from '../providers/provider.entity.js';

@Entity('favorites')
export class Favorite {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  providerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  provider: Relation<Provider>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
