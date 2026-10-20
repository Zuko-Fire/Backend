import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number | undefined;

  @Column({ unique: true, type: 'varchar' })
  token!: string;

  @Column({ name: 'userId', type: 'int' })
  userId?: number;

  @Column({ name: 'expiresAt', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ default: false, name: 'revoked', type: 'boolean' })
  revoked?: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | undefined;
}
