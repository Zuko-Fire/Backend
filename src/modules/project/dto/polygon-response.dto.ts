import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PolygonResponseDto {
  @ApiProperty({ description: 'Unique polygon identifier' })
  id!: number;

  @ApiProperty({ description: 'Project ID' })
  project_id!: number;

  @ApiProperty({ description: 'Polygon name' })
  name!: string;

  @ApiProperty({ description: 'GeoJSON coordinates' })
  coordinates!: object;

  @ApiPropertyOptional({ description: 'PostGIS geometry data' })
  geometry?: string | null;

  @ApiProperty({ description: 'Created by user ID' })
  created_by!: number;

  @ApiProperty({ description: 'Updated by user ID' })
  updated_by!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  deletedAt?: Date | null;
}
