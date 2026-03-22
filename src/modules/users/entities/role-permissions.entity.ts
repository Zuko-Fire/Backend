import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Entity('role_permissions')
export class RolePermissions {
  @PrimaryColumn()
  role_id!: number;

  @PrimaryColumn()
  permission_id!: number;

  @ManyToOne(() => Role, (r) => r.rolePermissions)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Permission, (p) => p.rolePermissions)
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;
}
