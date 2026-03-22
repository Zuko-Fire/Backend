import * as typeorm from 'typeorm';
import { LandPlot } from './land-plot.entity';
import { Project } from './project.entity';

@typeorm.Entity('polygons')
export class Polygon {
  @typeorm.PrimaryGeneratedColumn()
  id!: number;

  @typeorm.Column()
  project_id!: number;

  @typeorm.Column()
  name!: string;

  @typeorm.Column({ type: 'jsonb' })
  coordinates!: typeorm.GeoJSON;

  @typeorm.Column()
  created_by!: number;

  @typeorm.Column()
  updated_by!: number;

  @typeorm.CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @typeorm.UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @typeorm.DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @typeorm.ManyToOne(() => Project, (p) => p.polygons)
  @typeorm.JoinColumn({ name: 'project_id' })
  project!: Project;

  @typeorm.OneToMany(() => LandPlot, (lp) => lp.polygon)
  landPlots!: LandPlot[];
}
