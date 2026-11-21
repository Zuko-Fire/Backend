import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min, IsEnum } from 'class-validator';
import { LayerFolderType } from '../entities/layer-folder.entity';

export class CreateLayerFolderDto {
  @ApiProperty({ description: 'ID проекта', example: 1 })
  @IsInt()
  @Min(1)
  projectId!: number;

  @ApiProperty({ description: 'Тип: folder или layer', enum: LayerFolderType, example: LayerFolderType.FOLDER })
  @IsEnum(LayerFolderType)
  type!: LayerFolderType;

  @ApiProperty({ description: 'Название папки/слоя', example: 'Земельные участки' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'ID родительской папки', example: null })
  @IsOptional()
  @IsInt()
  @Min(0)
  parentId?: number | null;

  @ApiPropertyOptional({ description: 'ID слоя НСПД (для type=layer)', example: 36048 })
  @IsOptional()
  @IsInt()
  @Min(0)
  layerId?: number | null;

  @ApiPropertyOptional({ description: 'Порядок отображения', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Видимость', example: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Свёрнута по умолчанию', example: false })
  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;

  @ApiPropertyOptional({ description: 'Описание', example: 'Слой земельных участков' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLayerFolderDto {
  @ApiPropertyOptional({ description: 'Название' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'ID родительской папки' })
  @IsOptional()
  @IsInt()
  @Min(0)
  parentId?: number | null;

  @ApiPropertyOptional({ description: 'ID слоя НСПД' })
  @IsOptional()
  @IsInt()
  @Min(0)
  layerId?: number | null;

  @ApiPropertyOptional({ description: 'Порядок отображения' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Видимость' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Свёрнута по умолчанию' })
  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsOptional()
  @IsString()
  description?: string;
}
