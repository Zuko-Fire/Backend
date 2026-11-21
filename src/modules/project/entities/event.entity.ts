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
  MEETING = 'meeting',
  FIELD_WORK = 'field_work',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

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

  // === Цель события ===
  @Column({ name: 'goal', type: 'text', nullable: true })
  goal!: string | null;

  // === Дата и время события ===
  @Column({ name: 'event_date', type: 'date', nullable: true })
  eventDate!: Date | null;

  @Column({ name: 'event_time', type: 'time', nullable: true })
  eventTime!: string | null;

  // === Место события (на карте) ===
  @Column({ name: 'location_name', type: 'varchar', nullable: true })
  locationName!: string | null; // Название места

  @Column({ name: 'location_lat', type: 'float', nullable: true })
  locationLat!: number | null; // Широта

  @Column({ name: 'location_lng', type: 'float', nullable: true })
  locationLng!: number | null; // Долгота

  @Column({ name: 'location_address', type: 'text', nullable: true })
  locationAddress!: string | null; // Адрес

  @Column({ name: 'location_coordinates', type: 'jsonb', nullable: true })
  locationCoordinates!: { lat: number; lng: number } | null; // Координаты в формате JSON

  // === Дедлайн ===
  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'is_done', type: 'boolean', default: false })
  isDone!: boolean;

  @Column({ name: 'done_at', type: 'timestamp', nullable: true })
  doneAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Project, (p) => p.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, (u) => u.events, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
