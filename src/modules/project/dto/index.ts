import type { GeoJSON } from 'typeorm';

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  IsObject,
  IsNumber,
  Max,
  Min,
  IsInt,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Название проекта',
    example: 'Жилой комплекс "Северный"',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Описание проекта',
    example: 'Многоэтажный жилой комплекс с инфраструктурой',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL изображения проекта',
    example: 'https://example.com/images/project.jpg',
  })
  @IsUrl()
  @IsOptional()
  picture?: string;
}

// update-project.dto.ts
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ description: 'Название проекта', minLength: 3 })
  @IsString()
  @IsOptional()
  @MinLength(3)
  name?: string;
}

// create-polygon.dto.ts
export class CreatePolygonDto {
  @ApiProperty({
    description: 'Название полигона',
    example: 'Участок №1',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    description: 'GeoJSON координаты полигона',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [37.6173, 55.7558],
          [37.62, 55.7558],
          [37.62, 55.76],
          [37.6173, 55.76],
          [37.6173, 55.7558],
        ],
      ],
    },
    type: 'array',
  })
  @IsObject()
  coordinates!: GeoJSON;

  @ApiPropertyOptional({
    description: 'ID земельного участка (опционально)',
    example: 1,
  })
  @IsOptional()
  landPlotId?: number;
}
// update-polygon.dto.ts
export class UpdatePolygonDto {
  name?: string;
  coordinates?: GeoJSON;
}

// geo-search.dto.ts

export class GeoSearchDto {
  @ApiProperty({
    description: 'Минимальная широта',
    example: 55.7,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat!: number;

  @ApiProperty({
    description: 'Максимальная широта',
    example: 55.8,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat!: number;

  @ApiProperty({
    description: 'Минимальная долгота',
    example: 37.5,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLon!: number;

  @ApiProperty({
    description: 'Максимальная долгота',
    example: 37.7,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLon!: number;
  bounds!: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export class GeoNearSearchDto {
  @ApiProperty({
    description: 'Широта точки поиска',
    example: 55.7558,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    description: 'Долгота точки поиска',
    example: 37.6173,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiProperty({
    description: 'Радиус поиска в метрах',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  radius!: number;
}

// create-land-plot.dto.ts

export class CreateLandPlotDto {
  @ApiProperty({
    description: 'Кадастровый номер',
    example: '77:01:0001001:123',
  })
  @IsString()
  cadastral_number!: string;

  @ApiProperty({
    description: 'Площадь в квадратных метрах',
    example: 1500.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  area!: number;

  @ApiProperty({
    description: 'Категория земель',
    example: 'Земли населённых пунктов',
  })
  @IsString()
  land_category!: string;

  @ApiProperty({
    description: 'Разрешённое использование',
    example: 'Для жилищного строительства',
  })
  @IsString()
  permitted_use!: string;

  @ApiProperty({
    description: 'Адрес участка',
    example: 'г. Москва, ул. Примерная, д. 1',
  })
  @IsString()
  address!: string;

  @ApiProperty({
    description: 'Статус участка',
    example: 'active',
    enum: ['active', 'archived', 'pending'],
  })
  @IsString()
  status!: string;

  @ApiProperty({
    description: 'Дата регистрации',
    example: '2024-01-15',
  })
  @IsDate()
  @Type(() => Date)
  registration_date!: Date;

  @ApiPropertyOptional({
    description: 'ID связанного полигона',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  polygon_id?: number;
}

// add-member.dto.ts
export enum ProjectRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export class AddMemberDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({
    description: 'Роль в проекте',
    enum: ProjectRole,
    example: ProjectRole.EDITOR,
  })
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}

// create-map-view.dto.ts

export class CreateMapViewDto {
  @ApiProperty({
    description: 'Широта центра карты',
    example: 55.7558,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    description: 'Долгота центра карты',
    example: 37.6173,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiProperty({
    description: 'Уровень зума (0-20)',
    example: 12,
    minimum: 0,
    maximum: 20,
  })
  @IsInt()
  @Min(0)
  @Max(20)
  zoom!: number;
}
