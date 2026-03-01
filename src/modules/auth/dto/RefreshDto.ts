import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token obtained during login',
    example: 'eyJhbGci...',
  })
  @IsString()
  refresh_token: string | undefined;
}
