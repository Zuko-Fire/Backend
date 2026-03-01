import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'Unique user identifier' })
  id?: number;

  @ApiProperty({ description: 'Email address' })
  email?: string;

  @ApiProperty({ description: 'Full name' })
  name?: string;

  @ApiProperty({ description: 'Active status' })
  isActive?: boolean;

  @ApiProperty({ description: 'Assigned roles', isArray: true })
  roles?: string[];

  @ApiProperty({ description: 'Avatar URL', required: false })
  avatar?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt?: Date;
}
