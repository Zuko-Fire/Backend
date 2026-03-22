import { IsEmail, MinLength } from 'class-validator';
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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number | undefined;
  @Column({ unique: true })
  @IsEmail()
  email!: string;

  @Column()
  name!: string;
  @Column()
  @MinLength(6)
  password!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column('simple-array', { nullable: true })
  roles: string[] | undefined;

  @Column({ nullable: true })
  avatar?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
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

}
