import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Polygon } from './polygon.entity';
import { MapView } from './map-view.entity';
import { ProjectMembers } from './project-members.entity';
import { Document } from './document.entity';
import { LayerFolder } from './layer-folder.entity';
import { LayerObject } from './layer-object.entity';
import { Comment } from './comment.entity';
import { Event } from './event.entity';
import { LandPlot } from './land-plot.entity';

export enum ProjectStatus {
  DRAFT = 'draft', // Черновик
  IN_REVIEW = 'in_review', // На проверке
  APPROVED = 'approved', // Утвержден
  RETURNED = 'returned', // Возвращен на доработку
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  picture!: string | null;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status!: ProjectStatus;

  @Column({ type: 'int', name: 'owner_id' })
  owner_id!: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @ManyToOne(() => User, (user) => user.ownedProjects)
  @JoinColumn({ name: 'owner_id' })
  owner: User | undefined;

  @OneToMany(() => Polygon, (p) => p.project)
  polygons!: Polygon[];

  @OneToMany(() => MapView, (mv) => mv.project)
  mapViews!: MapView[];

  @OneToMany(() => ProjectMembers, (pm) => pm.project)
  members!: ProjectMembers[];

  @OneToMany(() => Document, (doc) => doc.project)
  documents!: Document[];

  @OneToMany(() => LayerFolder, (lf) => lf.project)
  layerFolders!: LayerFolder[];

  @OneToMany(() => LayerObject, (lo) => lo.layerFolder)
  layerObjects!: LayerObject[];

  @OneToMany(() => Comment, (c) => c.project)
  comments!: Comment[];

  @OneToMany(() => Event, (e) => e.project)
  events!: Event[];

  @OneToMany(() => LandPlot, (lp) => lp.project)
  landPlots!: LandPlot[];
}
