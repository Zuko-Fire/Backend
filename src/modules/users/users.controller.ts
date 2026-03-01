import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt-auth.guard';
import { UserDto } from './dto/UserDto';
import { CurrentUser } from 'src/common/decorators/auth/user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
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
}
