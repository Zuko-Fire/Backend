import { BadRequestException, Injectable } from '@nestjs/common';
import { UserDto } from './dto/UserDto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypto from 'bcrypt';
import { RegisterDto } from '../auth/dto/RegisterDto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}
  async findByUsername(username: string) {
    const user = await this.userRepo.findOne({ where: { email: username } });
    return user;
  }
  async validatePassword(user: UserDto, password: string) {
    const userEntity = await this.userRepo.findOne({ where: { email: user.email } });
    if (!userEntity) return false;
    try {
      const match = await userEntity.comparePassword(password);
      return !!match;
    } catch (e) {
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
    const salt = await bcrypto.genSalt(10);
    return bcrypto.hash(password, salt);
  }
  async findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }
}
