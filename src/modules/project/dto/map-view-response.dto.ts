import { ApiProperty } from '@nestjs/swagger';

export class MapViewResponseDto {
  @ApiProperty({ description: 'Unique map view identifier' })
  id!: number;

  @ApiProperty({ description: 'Project ID' })
  project_id!: number;

  @ApiProperty({ description: 'User ID' })
  user_id!: number;

  @ApiProperty({ description: 'Latitude' })
  lat!: number;

  @ApiProperty({ description: 'Longitude' })
  lon!: number;

  @ApiProperty({ description: 'Zoom level' })
  zoom!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;
}
