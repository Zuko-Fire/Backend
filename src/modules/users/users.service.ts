import { BadRequestException, Injectable } from '@nestjs/common';
import { UserDto } from './dto/UserDto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/RegisterDto';
import { BCRYPT_SALT_ROUNDS } from 'src/common/constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findByUsername(username: string) {
    return this.userRepo.findOne({ where: { email: username } });
  }

  async validatePassword(user: UserDto, password: string) {
    const userEntity = await this.userRepo.findOne({
      where: { email: user.email },
    });
    if (!userEntity) return false;

    try {
      return !!userEntity.comparePassword(password);
    } catch {
      return false;
    }
  }

  async create(dto: RegisterDto) {
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  async hashPassword(password: string | undefined): Promise<string> {
    if (!password) {
      throw new BadRequestException('Password is required');
    }
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  async findById(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;

    const { password: _, ...result } = user;
    return result;
  }
}
