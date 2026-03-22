import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
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

  @ManyToOne(() => Polygon, (p) => p.landPlots, { nullable: true })
  polygon!: Polygon;
}
