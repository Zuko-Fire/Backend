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

export enum EventType {
  NOTE = 'note',
  DEADLINE = 'deadline',
  MILESTONE = 'milestone',
  WARNING = 'warning',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  project_id!: number;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.NOTE,
  })
  type!: EventType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  due_date!: Date | null;

  @Column({ name: 'is_done', type: 'boolean', default: false })
  is_done!: boolean;

  @Column({ name: 'done_at', type: 'timestamp', nullable: true })
  done_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Project, (p) => p.events)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, (u) => u.events)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
