import { IsEmail, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';
import { RefreshToken } from 'src/modules/auth/entities/refresh-token.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  OneToOne,
} from 'typeorm';

import * as bcrypt from 'bcrypt';
import { UserRoles } from './user-roles.entity';
import { ProjectMembers } from 'src/modules/project/entities/project-members.entity';
import { Project } from 'src/modules/project/entities/project.entity';

@Entity('users')
export class User {
  [x: string]: any;
  @PrimaryGeneratedColumn()
  id!: number | undefined;
  @Column({ unique: true, type: 'varchar' })
  @IsEmail()
  email!: string;

  @Column({ type: 'varchar' })
  name!: string;
  @Column({ type: 'varchar' })
  @MinLength(6)
  @Exclude()
  password!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column('simple-array', { nullable: true })
  roles: string[] | undefined;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  @Exclude()
  refreshTokens: RefreshToken[] | undefined;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      if (!this.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
    }
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(plainPassword, this.password);
  }

  @OneToMany(() => UserRoles, (ur) => ur.user)
  userRoles!: UserRoles[];

  @OneToMany(() => Project, (p) => p?.owner)
  ownedProjects: Project[] | undefined;

  @OneToMany(() => ProjectMembers, (pm) => pm.user)
  projectMemberships: ProjectMembers[] | undefined;
}
