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

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ nullable: true })
  picture!: string;

  @Column()
  owner_id!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
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
}
