import { IsEmail, MinLength, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Password - minimum 6 characters',
    minLength: 6,
    example: 'password1234',
  })
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'User roles (default: ["viewer"])',
    example: ['viewer', 'editor'],
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
