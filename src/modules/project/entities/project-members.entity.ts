// src/modules/project/entities/project-members.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../users/entities/user.entity';

export enum ProjectMemberRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

@Entity('project_members')
export class ProjectMembers {
  @PrimaryColumn({ name: 'project_id', type: 'int' })
  projectId!: number; // ✅ ! вместо | undefined

  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number; // ✅ ! вместо | undefined

  @Column({
    name: 'role_in_project',
    type: 'enum',
    enum: ProjectMemberRole,
    default: ProjectMemberRole.VIEWER,
  })
  roleInProject!: ProjectMemberRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;

  @ManyToOne(() => Project, (p) => p.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, (u) => u.projectMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User; // ✅ ! вместо | undefined
}
