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
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { isDev } from 'src/common/utils/is-dev';

@Injectable()
export class AuthService {
  private readonly COOKIE_DOMAIN: string;
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {
    this.COOKIE_DOMAIN = configService.get<string>('COOKIE_DOMAIN')!;
  }

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
  async login(user: UserDto, res: Response) {
    const payload = {
      name: user.name,
      sub: user.id,
      roles: user.roles,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // persist refresh token in database (upsert to avoid duplicate key errors)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.refreshTokenRepo.query(
      `INSERT INTO refresh_tokens (token, "userId", "expiresAt", revoked, "createdAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (token) DO UPDATE
       SET "userId" = $2, "expiresAt" = $3, revoked = $4, "createdAt" = NOW()`,
      [refreshToken, user.id, expiresAt, false],
    );
    this.setCookies(res, refreshToken, expiresAt);
    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        isActive: user.isActive,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async register(dto: RegisterDto, res: Response) {
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
    await this.refreshTokenRepo.query(
      `INSERT INTO refresh_tokens (token, "userId", "expiresAt", revoked, "createdAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (token) DO UPDATE
       SET "userId" = $2, "expiresAt" = $3, revoked = $4, "createdAt" = NOW()`,
      [refreshToken, user.id, expiresAt, false],
    );

    this.setCookies(res, refreshToken, expiresAt);
    return {
      access_token: accessToken,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        roles: result.roles,
        isActive: result.isActive,
        avatar: result.avatar,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    };
  }
  async refreshToken(res: Response, req: Request) {
    try {
      const { refresh_token: token } = this.getCookies(req);
      if (!token) {
        throw new UnauthorizedException('Refresh token not found');
      }
      let decoded: any;
      try {
        decoded = this.jwtService.verify(token);
      } catch {
        throw new UnauthorizedException('Invalid refresh token');
      }
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
        name: user.name,
        sub: user.id,
        roles: user.roles,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.refreshTokenRepo.query(
        `INSERT INTO refresh_tokens (token, "userId", "expiresAt", revoked, "createdAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (token) DO UPDATE
         SET "userId" = $2, "expiresAt" = $3, revoked = $4, "createdAt" = NOW()`,
        [refresh_token, user.id, expiresAt, false],
      );

      this.setCookies(res, refresh_token, expiresAt);
      return { access_token };
    } catch (e) {
      console.error('Error refreshing token', e);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  private setCookies(res: Response, value: string, expire: Date) {
    const isProduction = !isDev(this.configService);
    res.cookie('refreshtoken', value, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      expires: expire,
      domain: this.COOKIE_DOMAIN,
    });
  }
  private getCookies(req: Request) {
    const headers = req.headers as any;
    const cookieHeader = (headers.cookie as string) || '';
    if (!cookieHeader) return {};
    const cookies = cookieHeader.split(';');
    const refreshTokenCookie = cookies.find((c: string) =>
      c.trim().startsWith('refreshtoken='),
    );
    if (!refreshTokenCookie) return {};
    const [, value] = refreshTokenCookie.split('=');
    return { refresh_token: value };
  }
}
