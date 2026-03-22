import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';


@Entity('project_members')
export class ProjectMembers {
  @PrimaryColumn()
  project_id!: number;

  @PrimaryColumn()
  user_id!: number;

  @Column({ type: 'enum', enum: ['viewer', 'editor', 'admin'] })
  role_in_project!: string;

  @ManyToOne(() => Project, (p) => p.members)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
