import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsEnum, IsDate, IsBoolean, IsNumber, Min as MinVal, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @ApiProperty({ description: 'ID проекта', example: 1 })
  @IsInt()
  @Min(1)
  projectId!: number;

  @ApiProperty({ description: 'Тип события', enum: EventType, example: EventType.NOTE })
  @IsEnum(EventType)
  type!: EventType;

  @ApiProperty({ description: 'Заголовок', example: 'Проверить границы участка' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Описание', example: 'Необходимо проверить границы на местности' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Цель события', example: 'Выехать на участок для проверки границ' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ description: 'Дата события', example: '2025-02-15' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  eventDate?: Date;

  @ApiPropertyOptional({ description: 'Время события', example: '14:30' })
  @IsOptional()
  @IsString()
  eventTime?: string;

  @ApiPropertyOptional({ description: 'Название места', example: 'Участок на ул. Чехова' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ description: 'Широта места', example: 55.7558 })
  @IsOptional()
  @IsNumber()
  @MinVal(-90)
  locationLat?: number;

  @ApiPropertyOptional({ description: 'Долгота места', example: 37.6173 })
  @IsOptional()
  @IsNumber()
  @MinVal(-180)
  @Max(180)
  locationLng?: number;

  @ApiPropertyOptional({ description: 'Адрес места', example: 'г. Москва, ул. Чехова, д. 10' })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ description: 'Координаты места в формате JSON', example: { lat: 55.7558, lng: 37.6173 } })
  @IsOptional()
  locationCoordinates?: { lat: number; lng: number };

  @ApiPropertyOptional({ description: 'Дедлайн', example: '2025-02-01T00:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Выполнено', example: false })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'Заголовок' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Цель' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ description: 'Дата события' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  eventDate?: Date;

  @ApiPropertyOptional({ description: 'Время события' })
  @IsOptional()
  @IsString()
  eventTime?: string;

  @ApiPropertyOptional({ description: 'Название места' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ description: 'Широта' })
  @IsOptional()
  @IsNumber()
  @MinVal(-90)
  locationLat?: number;

  @ApiPropertyOptional({ description: 'Долгота' })
  @IsOptional()
  @IsNumber()
  @MinVal(-180)
  @Max(180)
  locationLng?: number;

  @ApiPropertyOptional({ description: 'Адрес' })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ description: 'Координаты места' })
  @IsOptional()
  locationCoordinates?: { lat: number; lng: number };

  @ApiPropertyOptional({ description: 'Дедлайн' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Выполнено' })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @ApiPropertyOptional({ description: 'Тип события' })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;
}
