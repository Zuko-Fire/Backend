import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDto } from '../users/dto/UserDto';
import { RegisterDto } from './dto/RegisterDto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<UserDto | null> {
    try {
      const user = await this.usersService.findByUsername(username);
      if (user && (await this.usersService.validatePassword(user, password))) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
      }
      return null;
    } catch (e) {
      console.error('Error validating user', e);
      return null;
    }
  }
  async login(user: UserDto) {
    const payload = {
      name: user.name,
      sub: user.id,
      roles: user.roles,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // persist refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.refreshTokenRepo.save({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      revoked: false,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async register(dto: RegisterDto) {
    if (!dto.email || !dto.password || !dto.name) {
      throw new BadRequestException('Email, name and password are required');
    }
    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }
    if (await this.usersService.findByUsername(dto.email)) {
      throw new BadRequestException('Email already in use');
    }
    const hashedPassword = await this.usersService.hashPassword(dto.password);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    const tokenPayload = {
      name: user.name,
      sub: user.id,
      roles: user.roles,
    };
    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: '7d',
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepo.save({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      revoked: false,
    });

    return {
      ...result,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
  async refreshToken(token: string) {
    // verify JWT first
    try {
      const decoded: unknown = this.jwtService.verify(token) ?? null;
      if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // check token in database
      const stored = await this.refreshTokenRepo.findOne({
        where: { token, revoked: false },
      });
      if (!stored) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }
      if (stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const user = await this.usersService.findById(decoded.sub as number);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // optionally revoke old token (prevent reuse)
      stored.revoked = true;
      await this.refreshTokenRepo.save(stored);

      const payload = {
        username: user.name,
        sub: user.id,
        roles: user.roles,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.refreshTokenRepo.save({
        token: refresh_token,
        userId: user.id,
        expiresAt,
        revoked: false,
      });

      return { access_token, refresh_token };
    } catch (e) {
      console.error('Error refreshing token', e);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
