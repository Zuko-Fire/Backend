import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Polygon } from './polygon.entity';
import { Document } from './document.entity';

@Entity('land_plots')
export class LandPlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: true, type: 'varchar' })
  cadastral_number!: string | null;

  @Column({ type: 'float', nullable: true })
  area!: number | null;

  @Column({ name: 'land_category', type: 'varchar', nullable: true })
  land_category!: string | null;

  @Column({ name: 'permitted_use', type: 'varchar', nullable: true })
  permitted_use!: string | null;

  @Column({ type: 'varchar', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', nullable: true })
  status!: string | null;

  @Column({ name: 'registration_date', type: 'date', nullable: true })
  registration_date!: Date | null;

  // === Геодезические данные ===

  @Column({ name: 'owner_name', type: 'varchar', nullable: true })
  owner_name!: string | null; // Собственник / арендатор

  @Column({ name: 'cadastral_cost', type: 'float', nullable: true })
  cadastral_cost!: number | null; // Кадастровая стоимость

  @Column({
    name: 'coordinate_system',
    type: 'varchar',
    nullable: true,
    comment: 'Система координат (Общеземная, Референцная, местная)',
  })
  coordinate_system!: string | null;

  @Column({
    name: 'coordinates_data',
    type: 'jsonb',
    nullable: true,
    comment: 'Координаты поворотных точек (X, Y, H)',
  })
  coordinates_data!: Array<{
    point_number?: number;
    x: number;
    y: number;
    h?: number;
    method?: string;
    accuracy_mt?: number;
  }> | null;

  @Column({
    name: 'measurement_method',
    type: 'varchar',
    nullable: true,
    comment:
      'Метод определения координат (ГНСС/GNSS, тахеометр, фотограмметрия)',
  })
  measurement_method!: string | null;

  @Column({
    name: 'accuracy_mt',
    type: 'float',
    nullable: true,
    comment: 'Средняя квадратическая погрешность Mt',
  })
  accuracy_mt!: number | null;

  @Column({
    name: 'boundary_marker_type',
    type: 'varchar',
    nullable: true,
    comment: 'Тип межевого знака (временный, долговременный)',
  })
  boundary_marker_type!: string | null;

  @Column({
    name: 'adjacent_users',
    type: 'jsonb',
    nullable: true,
    comment: 'Смежные землепользователи',
  })
  adjacent_users!: Array<{
    cadastral_number?: string;
    name?: string;
    fio?: string;
    boundary_part?: string;
  }> | null;

  @Column({
    name: 'boundary_agreement_act',
    type: 'jsonb',
    nullable: true,
    comment: 'Акт согласования границ',
  })
  boundary_agreement_act!: {
    participants?: Array<{ fio?: string; address?: string; signed?: boolean }>;
    act_file?: string;
    signed_at?: Date;
  } | null;

  @Column({
    name: 'boundary_description',
    type: 'text',
    nullable: true,
    comment: 'Описание прохождения границ (по забору, по оси дороги)',
  })
  boundary_description!: string | null;

  @Column({ name: 'polygon_id', type: 'int', nullable: true })
  polygon_id!: number | null;

  @ManyToOne(() => Polygon, (p) => p.landPlots, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'polygon_id' })
  polygon!: Polygon | null;

  @OneToMany(() => Document, (doc) => doc.landPlot)
  documents!: Document[];
}
