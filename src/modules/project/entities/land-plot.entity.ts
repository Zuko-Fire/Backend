import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Polygon } from './polygon.entity';

@Entity('land_plots')
export class LandPlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  cadastral_number!: string;

  @Column({ type: 'float' })
  area!: number;

  @Column()
  land_category!: string;

  @Column()
  permitted_use!: string;

  @Column()
  address!: string;

  @Column()
  status!: string;

  @Column({ type: 'date' })
  registration_date!: Date;

  @Column({ name: 'polygon_id', nullable: true })
  polygon_id!: number | null;

  @ManyToOne(() => Polygon, (p) => p.landPlots, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'polygon_id' })
  polygon!: Polygon | null;
}
