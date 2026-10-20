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
import {
  REFRESH_TOKEN_EXPIRY_MS,
  COOKIE_NAME,
  COOKIE_CONFIG,
} from 'src/common/constants';

/**
 * SQL upsert for refresh tokens
 */
const REFRESH_TOKEN_UPSERT_SQL = `
  INSERT INTO refresh_tokens (token, "userId", "expiresAt", revoked, "createdAt")
  VALUES ($1, $2, $3, $4, NOW())
  ON CONFLICT (token) DO UPDATE
  SET "userId" = $2, "expiresAt" = $3, revoked = $4, "createdAt" = NOW()
`;

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

  // ==================== Validation ====================

  async validateUser(
    username: string,
    password: string,
  ): Promise<UserDto | null> {
    try {
      const user = await this.usersService.findByUsername(username);
      if (user && (await this.usersService.validatePassword(user, password))) {
        const { password: _, ...result } = user;
        return result;
      }
      return null;
    } catch (e) {
      console.error('Error validating user', e);
      return null;
    }
  }

  // ==================== Login / Register ====================

  async login(user: UserDto, res: Response) {
    const tokenPayload = this.createTokenPayload(user);
    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: '7d',
    });

    await this.saveRefreshToken(refreshToken, user.id!, res);

    return {
      access_token: accessToken,
      user: this.sanitizeUserResponse(user),
    };
  }

  async register(dto: RegisterDto, res: Response) {
    this.validateRegisterDto(dto);

    if (await this.usersService.findByUsername(dto.email!)) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await this.usersService.hashPassword(dto.password);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    const tokenPayload = this.createTokenPayload(user);
    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: '7d',
    });

    await this.saveRefreshToken(refreshToken, user.id!, res);

    return {
      access_token: accessToken,
      user: this.sanitizeUserResponse(user),
    };
  }

  // ==================== Refresh Token ====================

  async refreshToken(res: Response, req: Request) {
    try {
      const { refresh_token: token } = this.parseCookies(req);
      if (!token) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const decoded = this.verifyToken(token);
      const userId = decoded.sub as number;

      // Check token in database
      const stored = await this.refreshTokenRepo.findOne({
        where: { token, revoked: false },
      });
      if (!stored) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }
      if (stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Revoke old token to prevent reuse
      stored.revoked = true;
      await this.refreshTokenRepo.save(stored);

      // Issue new tokens
      const tokenPayload = this.createTokenPayload(user);
      const access_token = this.jwtService.sign(tokenPayload);
      const refresh_token = this.jwtService.sign(tokenPayload, {
        expiresIn: '7d',
      });

      await this.saveRefreshToken(refresh_token, user.id!, res);
      return { access_token };
    } catch (e) {
      console.error('Error refreshing token', e);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Creates JWT payload from user object
   */
  private createTokenPayload(user: UserDto) {
    return {
      name: user.name,
      sub: user.id,
      roles: user.roles,
    };
  }

  /**
   * Sanitizes user data for API response
   */
  private sanitizeUserResponse(user: UserDto) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isActive: user.isActive,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Saves refresh token to DB and sets cookie
   */
  private async saveRefreshToken(
    token: string,
    userId: number,
    res: Response,
  ) {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await this.refreshTokenRepo.query(REFRESH_TOKEN_UPSERT_SQL, [
      token,
      userId,
      expiresAt,
      false,
    ]);

    this.setCookie(res, token, expiresAt);
  }

  /**
   * Verifies JWT token and throws if invalid
   */
  private verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validates register DTO fields
   */
  private validateRegisterDto(dto: RegisterDto) {
    if (!dto.email || !dto.password || !dto.name) {
      throw new BadRequestException('Email, name and password are required');
    }
  }

  /**
   * Sets refresh token cookie with proper security settings
   */
  private setCookie(res: Response, value: string, expire: Date) {
    const isProduction = !isDev(this.configService);

    res.cookie(COOKIE_NAME, value, {
      httpOnly: COOKIE_CONFIG.HTTP_ONLY,
      secure: isProduction ? COOKIE_CONFIG.SECURE_PROD : false,
      sameSite: isProduction
        ? COOKIE_CONFIG.SAMESITE_PROD
        : COOKIE_CONFIG.SAMESITE_DEV,
      expires: expire,
      domain: this.COOKIE_DOMAIN,
    });
  }

  /**
   * Parses cookies from request
   */
  private parseCookies(req: Request) {
    const headers = req.headers as unknown as Record<string, string | undefined>;
    const cookieHeader = headers.cookie || '';
    if (!cookieHeader) return {};

    const cookies = cookieHeader.split(';');
    const refreshTokenCookie = cookies.find((c: string) =>
      c.trim().startsWith(`${COOKIE_NAME}=`),
    );
    if (!refreshTokenCookie) return {};

    const [, value] = refreshTokenCookie.split('=');
    return { refresh_token: value };
  }
}
