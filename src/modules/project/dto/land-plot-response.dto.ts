import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LandPlotResponseDto {
  @ApiProperty({ description: 'Unique land plot identifier' })
  id!: number;

  @ApiPropertyOptional({ description: 'Cadastral number' })
  cadastral_number?: string;

  @ApiProperty({ description: 'Area in square meters' })
  area!: number;

  @ApiProperty({ description: 'Land category' })
  land_category!: string;

  @ApiProperty({ description: 'Permitted use type' })
  permitted_use!: string;

  @ApiPropertyOptional({ description: 'Address' })
  address?: string;

  @ApiPropertyOptional({ description: 'Registration status' })
  status?: string;

  @ApiPropertyOptional({ description: 'Registration date' })
  registration_date?: Date;

  @ApiPropertyOptional({ description: 'Owner name' })
  owner_name?: string;

  @ApiPropertyOptional({ description: 'Cadastral cost' })
  cadastral_cost?: number;

  @ApiPropertyOptional({ description: 'Coordinate system' })
  coordinate_system?: string;

  @ApiPropertyOptional({ description: 'Point coordinates data' })
  coordinates_data?: object;

  @ApiPropertyOptional({ description: 'Measurement method' })
  measurement_method?: string;

  @ApiPropertyOptional({ description: 'Accuracy in meters' })
  accuracy_mt?: number;

  @ApiPropertyOptional({ description: 'Boundary marker type' })
  boundary_marker_type?: string;

  @ApiPropertyOptional({ description: 'Adjacent users data' })
  adjacent_users?: object;

  @ApiPropertyOptional({ description: 'Boundary agreement act' })
  boundary_agreement_act?: object;

  @ApiPropertyOptional({ description: 'Boundary description' })
  boundary_description?: string;

  @ApiProperty({ description: 'Associated polygon ID' })
  polygon_id!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  deletedAt?: Date | null;
}
