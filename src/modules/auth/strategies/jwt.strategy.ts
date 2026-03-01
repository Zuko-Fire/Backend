// auth/strategies/jwt.strategy.ts

import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';
import { UserDto } from 'src/modules/users/dto/UserDto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      // passport-jwt throws if secret empty, so fail fast with descriptive error
      throw new Error('JWT_SECRET must be defined in configuration');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any): Promise<UserDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = payload?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const userEntity = await this.usersService.findById(userId as number);
    if (!userEntity) {
      throw new UnauthorizedException();
    }
    // remove password and map to DTO-like object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = userEntity;
    return result as UserDto;
  }
}
