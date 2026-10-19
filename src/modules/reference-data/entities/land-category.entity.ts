import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LandPlot } from '../../project/entities/land-plot.entity';

@Entity('reference_land_categories')
export class LandCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // Категория земель

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'code', unique: true, nullable: true })
  code!: string | null; // Код по ОКВТ

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => LandPlot, (lp) => lp.land_category)
  landPlots!: LandPlot[];
}
