import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email: string | undefined;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  name: string | undefined;

  @ApiProperty({ description: 'Password - minimum 6 characters', minLength: 6 })
  @MinLength(6)
  password: string | undefined;
}
