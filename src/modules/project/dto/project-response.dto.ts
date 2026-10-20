import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ description: 'Unique project identifier' })
  id!: number;

  @ApiProperty({ description: 'Project name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Project description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Project picture URL' })
  picture?: string;

  @ApiProperty({ description: 'Project status', enum: ['draft', 'in_review', 'approved', 'returned'] })
  status!: string;

  @ApiProperty({ description: 'Owner user ID' })
  owner_id!: number;

  @ApiPropertyOptional({ description: 'Owner user info' })
  owner?: {
    id: number;
    name: string;
    email: string;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  deletedAt?: Date | null;
}
