import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reference_precision_standards')
export class PrecisionStandard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'land_category' })
  landCategory!: string; // Категория земель

  @Column({ name: 'max_accuracy_mt', type: 'float' })
  maxAccuracyMt!: number; // Максимальная точность Mt (м)

  @Column({ name: 'allowed_area_deviation', type: 'float' })
  allowedAreaDeviation!: number; // Допустимое расхождение площади ΔS доп

  @Column({ name: 'allowed_perimeter_deviation', type: 'float' })
  allowedPerimeterDeviation!: number; // Допустимое расхождение периметра ΔР доп

  @Column({ name: 'allowed_point_deviation', type: 'float' })
  allowedPointDeviation!: number; // Допустимое отклонение точки (м)

  @Column({ type: 'text', nullable: true })
  note!: string | null; // Примечание / ссылка на норматив

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
