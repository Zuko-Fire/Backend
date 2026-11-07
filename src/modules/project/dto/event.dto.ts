import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsEnum, IsDate, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Дедлайн' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Выполнено' })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @ApiPropertyOptional({ description: 'Статус: note, deadline, milestone, warning' })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;
}
