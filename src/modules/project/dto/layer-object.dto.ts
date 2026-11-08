import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsBoolean, IsNumber, Max } from 'class-validator';

export class CreateLayerObjectDto {
  @ApiProperty({ description: 'ID слоя/папки', example: 1 })
  @IsInt()
  @Min(1)
  layerFolderId!: number;

  @ApiProperty({ description: 'ID полигона', example: 1 })
  @IsInt()
  @Min(1)
  polygonId!: number;

  @ApiPropertyOptional({ description: 'Имя объекта на слое (как в Figma)', example: 'Участок А' })
  @IsOptional()
  @IsString()
  objectName?: string;

  @ApiPropertyOptional({ description: 'Видимость', example: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Заблокирован', example: false })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Прозрачность 0-1', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiPropertyOptional({ description: 'Порядок на слое (z-index)', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class UpdateLayerObjectDto {
  @ApiPropertyOptional({ description: 'Имя объекта на слое' })
  @IsOptional()
  @IsString()
  objectName?: string;

  @ApiPropertyOptional({ description: 'Видимость' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Заблокирован' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Прозрачность 0-1' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiPropertyOptional({ description: 'Порядок на слое' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
