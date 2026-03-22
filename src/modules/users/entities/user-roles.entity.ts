import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { User } from './user.entity';

// src/auth/entities/user-roles.entity.ts
@Entity('user_roles')
export class UserRoles {
  @PrimaryColumn()
  user_id!: number;

  @PrimaryColumn()
  role_id!: number;

  @ManyToOne(() => User, (u) => u.userRoles)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Role, (r) => r.userRoles)
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
