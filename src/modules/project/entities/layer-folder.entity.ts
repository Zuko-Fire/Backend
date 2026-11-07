import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum LayerFolderType {
  FOLDER = 'folder',
  LAYER = 'layer',
}

@Entity('layer_folders')
export class LayerFolder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @Column({ type: 'varchar', default: LayerFolderType.FOLDER })
  type!: LayerFolderType;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId!: number | null;

  @Column({ name: 'layer_id', type: 'int', nullable: true })
  layerId!: number | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ name: 'is_collapsed', type: 'boolean', default: false })
  isCollapsed!: boolean;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Project, (p) => p.layerFolders)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => LayerFolder, (f) => f.children)
  @JoinColumn({ name: 'parent_id' })
  parent!: LayerFolder | null;

  @OneToMany(() => LayerFolder, (f) => f.parent)
  children!: LayerFolder[];
}
