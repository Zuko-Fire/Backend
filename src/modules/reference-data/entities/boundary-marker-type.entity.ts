import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reference_boundary_marker_types')
export class BoundaryMarkerType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, type: 'varchar' })
  name!: string; // Тип межевого знака (временный, долговременный)

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'material_requirements', type: 'text', nullable: true })
  materialRequirements!: string | null; // Требования к материалу

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
