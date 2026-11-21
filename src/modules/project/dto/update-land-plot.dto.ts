import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLandPlotDto {
  @ApiPropertyOptional({ description: 'Кадастровый номер', example: '77:01:0001001:123' })
  @IsOptional()
  @IsString()
  cadastral_number?: string;

  @ApiPropertyOptional({ description: 'Площадь (кв.м)', example: 1500.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ description: 'Категория земель', example: 'Земли населённых пунктов' })
  @IsOptional()
  @IsString()
  land_category?: string;

  @ApiPropertyOptional({ description: 'Разрешённое использование', example: 'Для жилищного строительства' })
  @IsOptional()
  @IsString()
  permitted_use?: string;

  @ApiPropertyOptional({ description: 'Адрес', example: 'г. Москва, ул. Примерная, д. 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Статус', example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Дата регистрации', example: '2024-01-15' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registration_date?: Date;

  @ApiPropertyOptional({ description: 'ID проекта', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  project_id?: number;

  @ApiPropertyOptional({ description: 'ID полигона', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  polygon_id?: number;

  @ApiPropertyOptional({ description: 'Собственник / арендатор', example: 'Иванов И.И.' })
  @IsOptional()
  @IsString()
  owner_name?: string;

  @ApiPropertyOptional({ description: 'Кадастровая стоимость', example: 5000000 })
  @IsOptional()
  @IsNumber()
  cadastral_cost?: number;

  @ApiPropertyOptional({ description: 'Система координат', example: 'Общеземная' })
  @IsOptional()
  @IsString()
  coordinate_system?: string;

  @ApiPropertyOptional({ description: 'Координаты поворотных точек', example: [{ point_number: 1, x: 1000, y: 2000, h: 100 }] })
  @IsOptional()
  coordinates_data?: Array<{
    point_number?: number;
    x: number;
    y: number;
    h?: number;
    method?: string;
    accuracy_mt?: number;
  }>;

  @ApiPropertyOptional({ description: 'Метод определения координат', example: 'ГНСС/GNSS' })
  @IsOptional()
  @IsString()
  measurement_method?: string;

  @ApiPropertyOptional({ description: 'Средняя квадратическая погрешность Mt', example: 0.05 })
  @IsOptional()
  @IsNumber()
  accuracy_mt?: number;

  @ApiPropertyOptional({ description: 'Тип межевого знака', example: 'долговременный' })
  @IsOptional()
  @IsString()
  boundary_marker_type?: string;

  @ApiPropertyOptional({ description: 'Смежные землепользователи', example: [{ cadastral_number: '77:01:0001001:124', name: 'Сосед' }] })
  @IsOptional()
  adjacent_users?: Array<{
    cadastral_number?: string;
    name?: string;
    fio?: string;
    boundary_part?: string;
  }>;

  @ApiPropertyOptional({ description: 'Акт согласования границ', example: { participants: [], signed_at: '2024-01-20' } })
  @IsOptional()
  boundary_agreement_act?: {
    participants?: Array<{ fio?: string; address?: string; signed?: boolean }>;
    act_file?: string;
    signed_at?: Date;
  };

  @ApiPropertyOptional({ description: 'Описание прохождения границ', example: 'По забору' })
  @IsOptional()
  @IsString()
  boundary_description?: string;
}
