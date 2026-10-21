import * as typeorm from 'typeorm';
import { LandPlot } from './land-plot.entity';
import { Project } from './project.entity';

@typeorm.Entity('polygons')
export class Polygon {
  @typeorm.PrimaryGeneratedColumn()
  id!: number;

  @typeorm.Column({ type: 'int', name: 'project_id' })
  project_id!: number;

  @typeorm.Column({ type: 'varchar' })
  name!: string;

  @typeorm.Column({ type: 'jsonb' })
  coordinates!: any;

  @typeorm.Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  geometry!: string;

  @typeorm.Column({ name: 'created_by', type: 'int' })
  created_by!: number;

  @typeorm.Column({ name: 'updated_by', type: 'int' })
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

  @typeorm.AfterLoad()
  private loadGeometry(): void {
    if (this.coordinates && !this.geometry) {
      this.geometry =
        typeof this.coordinates === 'string'
          ? this.coordinates
          : JSON.stringify(this.coordinates);
    }
    // Parse coordinates string back to object if needed
    if (typeof this.coordinates === 'string') {
      try {
        this.coordinates = JSON.parse(this.coordinates);
      } catch {
        // ignore parse errors
      }
    }
  }

  @typeorm.BeforeInsert()
  @typeorm.BeforeUpdate()
  private syncGeometry(): void {
    let coordsObj: any = this.coordinates;
    if (typeof this.coordinates === 'string') {
      try {
        coordsObj = JSON.parse(this.coordinates);
      } catch {
        return;
      }
    }
    if (coordsObj && coordsObj.type === 'Polygon' && coordsObj.coordinates) {
      // Convert GeoJSON Polygon to WKT for PostGIS
      const coords = coordsObj.coordinates[0] as number[][];
      const wktPoints = coords
        .map((p: number[]) => `${p[0]} ${p[1]}`)
        .join(', ');
      this.geometry = `POLYGON((${wktPoints}))`;
    }
  }
}
