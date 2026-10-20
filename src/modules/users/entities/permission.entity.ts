import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermissions } from './role-permissions.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @OneToMany(() => RolePermissions, (rp) => rp.permission)
  rolePermissions!: RolePermissions[];
}
