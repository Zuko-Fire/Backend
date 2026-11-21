import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsNumber, Min as MinVal, Max } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'ID проекта', example: 1 })
  @IsInt()
  @Min(1)
  projectId!: number;

  @ApiProperty({ description: 'Широта точки', example: 55.7558 })
  @IsNumber()
  @MinVal(-90)
  lat!: number;

  @ApiProperty({ description: 'Долгота точки', example: 37.6173 })
  @IsNumber()
  @MinVal(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ description: 'Текст замечания', example: 'Необходимо уточнить границы' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ description: 'Статус', example: 'open' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: 'Текст замечания' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Широта' })
  @IsOptional()
  @IsNumber()
  @MinVal(-90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Долгота' })
  @IsOptional()
  @IsNumber()
  @MinVal(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: 'Статус: open, resolved, dismissed' })
  @IsOptional()
  @IsString()
  status?: string;
}
