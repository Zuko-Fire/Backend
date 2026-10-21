import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserDto } from './dto/UserDto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, IsNull } from 'typeorm';
import { paginate } from 'src/common/utils/pagination';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/RegisterDto';
import { CreateUserDto } from './dto/CreateUserDto';
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

  async createUser(dto: CreateUserDto) {
    // Check if email already exists
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = this.userRepo.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      roles: dto.roles ?? ['viewer'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  async findAllUsers(page = 1, limit = 10) {
    const [users, total] = await this.userRepo.findAndCount({
      where: { deletedAt: IsNull() },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'email',
        'name',
        'roles',
        'isActive',
        'avatar',
        'createdAt',
        'updatedAt',
      ],
    });

    return paginate(users, total, page, limit);
  }
}
