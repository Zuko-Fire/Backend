// auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from 'src/common/decorators/auth/roles.decorator';
import { User } from 'src/common/decorators/auth/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/auth/roles.guard';
import { LocalAuthGuard } from 'src/common/guards/auth/local-auth.guard';
import { RegisterDto } from './dto/RegisterDto';
import { LoginDto } from './dto/LoginDto';
import { RefreshDto } from './dto/RefreshDto';
import { UserDto } from '../users/dto/UserDto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Returns access and refresh tokens.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  login(@Body() _dto: LoginDto, @User() user: UserDto) {
    // request should have { email, password }

    return this.authService.login(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User created and tokens returned.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input or email taken.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 201, description: 'New access and refresh tokens.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refresh_token!);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile returned.',
    type: UserDto,
  })
  getProfile(@User() user: UserDto) {
    return user;
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin-only example endpoint' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Admin data returned.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAdminData() {
    return { message: 'Admin access granted' };
  }
}
