import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseRegisterDto {
  @ApiProperty({ example: 1, description: 'ID пользователя' })
  id!: number;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  email!: string;

  @ApiProperty({ example: 'John Doe', description: 'Имя пользователя' })
  name!: string;

  @ApiProperty({ example: true, description: 'Активен ли пользователь' })
  isActive!: boolean;

  @ApiPropertyOptional({ example: ['user'], description: 'Роли пользователя' })
  roles!: string[] | null;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    description: 'Ссылка на аватар',
  })
  avatar!: string | null;

  @ApiProperty({
    example: '2026-03-22T12:01:14.615Z',
    description: 'Дата создания',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-03-22T12:01:14.615Z',
    description: 'Дата обновления',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Дата удаления (если есть)',
  })
  deletedAt!: string | null;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access токен',
  })
  access_token!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh токен',
  })
  refresh_token!: string;
}
