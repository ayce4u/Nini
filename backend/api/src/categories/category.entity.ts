import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('categories')
export class Category {
  /** Identifiant lisible, ex. "coiffure". */
  @PrimaryColumn({ length: 40 })
  slug: string;

  @Column({ length: 80 })
  name: string;

  /** Nom d'une icône Ionicons, ex. "cut-outline". */
  @Column({ length: 60 })
  icon: string;

  @Column({ default: 0 })
  sortOrder: number;
}
