import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  project_id!: number;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @Column({ type: 'float', name: 'lat' })
  lat!: number;

  @Column({ type: 'float', name: 'lng' })
  lng!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'varchar', nullable: true })
  status!: string | null; // 'open', 'resolved', 'dismissed'

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolved_at!: Date | null;

  @Column({ name: 'resolved_by', type: 'int', nullable: true })
  resolved_by!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Project, (p) => p.comments)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, (u) => u.comments)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy!: User | null;
}
