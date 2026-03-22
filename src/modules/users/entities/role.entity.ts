import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserRoles } from './user-roles.entity';
import { RolePermissions } from './role-permissions.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @OneToMany(() => UserRoles, (ur) => ur.role)
  userRoles?: UserRoles[];

  @OneToMany(() => RolePermissions, (rp) => rp.role)
  rolePermissions!: RolePermissions[];
}
