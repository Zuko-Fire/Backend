import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LayerFolder } from './layer-folder.entity';
import { Polygon } from './polygon.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('layer_objects')
export class LayerObject {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'layer_folder_id', type: 'int' })
  layerFolderId!: number;

  @Column({ name: 'polygon_id', type: 'int' })
  polygonId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'object_name', type: 'varchar', nullable: true })
  objectName!: string | null; // Имя объекта на слое (как в Figma)

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ name: 'opacity', type: 'float', default: 1.0 })
  opacity!: number; // Прозрачность 0-1

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number; // Порядок на слое (z-index)

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => LayerFolder, (lf) => lf.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'layer_folder_id' })
  layerFolder!: LayerFolder;

  @ManyToOne(() => Polygon, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'polygon_id' })
  polygon!: Polygon;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
