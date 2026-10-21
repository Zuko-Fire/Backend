import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/auth/roles.guard';
import { Roles } from 'src/common/decorators/auth/roles.decorator';
import { CurrentUser } from 'src/common/decorators/auth/user.decorator';
import { UserDto } from './dto/UserDto';
import { CreateUserDto } from './dto/CreateUserDto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve logged-in user profile' })
  @ApiResponse({ status: 200, description: 'Current user data', type: UserDto })
  getProfile(@CurrentUser() user: UserDto) {
    return user;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Получить всех пользователей (только админы)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Список всех пользователей' })
  @ApiResponse({ status: 403, description: 'Доступ только для админов' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.userService.findAllUsers(+page, +limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Создать пользователя (только админы)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные или email занят',
  })
  @ApiResponse({ status: 403, description: 'Доступ только для админов' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
