import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { Project } from './project.entity';
import { LandPlot } from './land-plot.entity';
import { User } from 'src/modules/users/entities/user.entity';

export enum DocumentType {
  ASSIGNMENT = 'assignment', // Задание на межевание
  RIGHT_DOCUMENT = 'right_document', // Правоустанавливающие документы
  EXTRACT_EGRN = 'extract_egrp', // Выписки из ЕГРН
  BOUNDARY_AGREEMENT = 'boundary_agreement', // Акт согласования границ
  SURVEY_DATA = 'survey_data', // Данные съемки (DXF, CSV, LandXML)
  PHOTO = 'photo', // Фотофиксация
  OTHER = 'other',
}

@Entity('project_documents')
export class Document extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER,
  })
  type!: DocumentType;

  @Column({ name: 'file_path' })
  filePath!: string; // Путь к файлу (S3, local path, URL)

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: number | null; // Размер файла в байтах

  @Column({ name: 'mime_type', nullable: true })
  mimeType!: string | null;

  @Column({ name: 'project_id', nullable: true })
  project_id!: number | null;

  @Column({ name: 'land_plot_id', nullable: true })
  land_plot_id!: number | null;

  @Column({ name: 'uploaded_by' })
  uploaded_by!: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @ManyToOne(() => Project, (project) => project.documents, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project | null;

  @ManyToOne(() => LandPlot, (landPlot) => landPlot.documents, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'land_plot_id' })
  landPlot!: LandPlot | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader!: User | null;
}
