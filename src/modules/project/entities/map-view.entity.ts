import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('map_views')
export class MapView {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  project_id!: number;

  @Column()
  user_id!: number;

  @Column({ type: 'float' })
  lat!: number;

  @Column({ type: 'float' })
  lon!: number;

  @Column()
  zoom!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Project, (p) => p.mapViews)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
