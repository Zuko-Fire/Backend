// src/modules/projects/projects.controller.ts

import {
  Controller,
  UseGuards,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt-auth.guard';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreatePolygonDto,
  UpdatePolygonDto,
  GeoSearchDto,
  GeoNearSearchDto,
  CreateLandPlotDto,
  AddMemberDto,
  CreateMapViewDto,
} from './dto';
import { ProjectService } from './project.service';
import { User } from 'src/common/decorators/auth/user.decorator';
import { UserDto } from '../users/dto/UserDto';

@ApiTags('Projects')
@ApiBearerAuth('JWT')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private projectsService: ProjectService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить список проектов',
    description:
      'Возвращает пагинированный список всех проектов с возможностью фильтрации по владельцу',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'owner_id', required: false, type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список проектов получен успешно',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Project' },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Неавторизован' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('owner_id') ownerId?: number,
  ) {
    return this.projectsService.findAll(
      +page,
      +limit,
      ownerId ? +ownerId : undefined,
    );
  }

  @Get('my')
  @ApiOperation({
    summary: 'Получить мои проекты',
    description:
      'Возвращает проекты, где текущий пользователь является владельцем',
  })
  @ApiResponse({
    status: 200,
    description: 'Список проектов владельца',
    type: [Object],
  })
  async findMyProjects(@User() user: UserDto) {
    return this.projectsService.findMyProjects(user.id!);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить проект по ID',
    description:
      'Возвращает полную информацию о проекте включая полигоны и участников',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID проекта', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Проект найден',
    schema: { $ref: '#/components/schemas/Project' },
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @ApiResponse({ status: 403, description: 'Нет доступа к проекту' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Создать новый проект',
    description: 'Создаёт проект и назначает текущего пользователя владельцем',
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: 201,
    description: 'Проект успешно создан',
    schema: { $ref: '#/components/schemas/Project' },
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async create(@Body() dto: CreateProjectDto, @User() user: UserDto) {
    return this.projectsService.create(dto, user.id!);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Обновить проект',
    description:
      'Обновляет информацию о проекте (только владелец или редактор)',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({
    status: 200,
    description: 'Проект обновлён',
    schema: { $ref: '#/components/schemas/Project' },
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @ApiResponse({ status: 403, description: 'Нет прав на редактирование' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить проект',
    description: 'Мягкое удаление проекта (soft delete)',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Проект удалён' })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @ApiResponse({ status: 403, description: 'Нет прав на удаление' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }

  // ==================== POLYGONS ====================

  @ApiTags('Polygons')
  @Get(':id/polygons')
  @ApiOperation({
    summary: 'Получить полигоны проекта',
    description: 'Возвращает все полигоны, связанные с проектом',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID проекта', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список полигонов',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Polygon' },
    },
  })
  async findPolygons(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findPolygons(id);
  }

  @ApiTags('Polygons')
  @Post(':id/polygons')
  @ApiOperation({
    summary: 'Создать полигон',
    description: 'Добавляет новый полигон к проекту с GeoJSON координатами',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID проекта', example: 1 })
  @ApiBody({ type: CreatePolygonDto })
  @ApiResponse({
    status: 201,
    description: 'Полигон создан',
    schema: { $ref: '#/components/schemas/Polygon' },
  })
  @ApiResponse({ status: 400, description: 'Некорректный GeoJSON' })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  async createPolygon(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePolygonDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.createPolygon(id, dto, user.id!);
  }

  @ApiTags('Polygons')
  @Get('polygons/:polygonId')
  @ApiOperation({
    summary: 'Получить полигон по ID',
    description: 'Возвращает полную информацию о полигоне',
  })
  @ApiParam({
    name: 'polygonId',
    type: Number,
    description: 'ID полигона',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Полигон найден',
    schema: { $ref: '#/components/schemas/Polygon' },
  })
  @ApiResponse({ status: 404, description: 'Полигон не найден' })
  async findPolygon(@Param('polygonId', ParseIntPipe) polygonId: number) {
    return this.projectsService.findPolygon(polygonId);
  }

  @ApiTags('Polygons')
  @Put('polygons/:polygonId')
  @ApiOperation({
    summary: 'Обновить полигон',
    description: 'Обновляет координаты или название полигона',
  })
  @ApiParam({ name: 'polygonId', type: Number, example: 1 })
  @ApiBody({ type: UpdatePolygonDto })
  @ApiResponse({
    status: 200,
    description: 'Полигон обновлён',
    schema: { $ref: '#/components/schemas/Polygon' },
  })
  async updatePolygon(
    @Param('polygonId', ParseIntPipe) polygonId: number,
    @Body() dto: UpdatePolygonDto,
  ) {
    return this.projectsService.updatePolygon(polygonId, dto);
  }

  @ApiTags('Polygons')
  @Delete('polygons/:polygonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить полигон',
    description: 'Мягкое удаление полигона',
  })
  @ApiParam({ name: 'polygonId', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Полигон удалён' })
  @ApiResponse({ status: 404, description: 'Полигон не найден' })
  async removePolygon(@Param('polygonId', ParseIntPipe) polygonId: number) {
    return this.projectsService.removePolygon(polygonId);
  }

  // ==================== GEO SEARCH ====================

  @ApiTags('Polygons')
  @Get('polygons/search/near')
  @ApiOperation({
    summary: 'Поиск полигонов рядом с точкой',
    description: 'Использует PostGIS ST_DWithin для поиска в радиусе',
  })
  @ApiQuery({
    name: 'lat',
    type: Number,
    description: 'Широта',
    example: 55.7558,
  })
  @ApiQuery({
    name: 'lon',
    type: Number,
    description: 'Долгота',
    example: 37.6173,
  })
  @ApiQuery({
    name: 'radius',
    type: Number,
    description: 'Радиус в метрах',
    example: 1000,
  })
  @ApiResponse({
    status: 200,
    description: 'Найденные полигоны',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Polygon' },
    },
  })
  async findPolygonsNear(@Query() dto: GeoNearSearchDto) {
    if (dto.radius > 100000) {
      throw new BadRequestException('Максимальный радиус 100км');
    }
    return this.projectsService.findPolygonsNearPoint(
      dto.lat,
      dto.lon,
      dto.radius,
    );
  }

  @ApiTags('Polygons')
  @Get('polygons/search/intersects')
  @ApiOperation({
    summary: 'Поиск полигонов в области',
    description:
      'Использует PostGIS ST_Intersects для поиска пересекающихся полигонов',
  })
  @ApiBody({ type: GeoSearchDto })
  @ApiResponse({
    status: 200,
    description: 'Найденные полигоны',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/Polygon' },
    },
  })
  async findPolygonsIntersects(@Body() dto: GeoSearchDto) {
    return this.projectsService.findPolygonsInArea(dto);
  }

  // ==================== LAND PLOTS ====================

  @ApiTags('LandPlots')
  @Get('land-plots')
  @ApiOperation({
    summary: 'Получить земельные участки',
    description:
      'Возвращает список участков с возможностью поиска по кадастровому номеру',
  })
  @ApiQuery({
    name: 'cadastral_number',
    required: false,
    type: String,
    example: '77:01:0001001:123',
  })
  @ApiResponse({
    status: 200,
    description: 'Список участков',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/LandPlot' },
    },
  })
  async findLandPlots(@Query('cadastral_number') cadastral?: string) {
    return this.projectsService.findLandPlots(cadastral);
  }

  @ApiTags('LandPlots')
  @Post('land-plots')
  @ApiOperation({
    summary: 'Создать земельный участок',
    description: 'Добавляет новый земельный участок в систему',
  })
  @ApiBody({ type: CreateLandPlotDto })
  @ApiResponse({
    status: 201,
    description: 'Участок создан',
    schema: { $ref: '#/components/schemas/LandPlot' },
  })
  @ApiResponse({ status: 409, description: 'Кадастровый номер уже существует' })
  async createLandPlot(@Body() dto: CreateLandPlotDto) {
    return this.projectsService.createLandPlot(dto);
  }

  @ApiTags('LandPlots')
  @Get('land-plots/:id')
  @ApiOperation({
    summary: 'Получить участок по ID',
    description: 'Возвращает полную информацию о земельном участке',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Участок найден',
    schema: { $ref: '#/components/schemas/LandPlot' },
  })
  @ApiResponse({ status: 404, description: 'Участок не найден' })
  async findLandPlot(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findLandPlot(id);
  }

  // ==================== PROJECT MEMBERS ====================

  @ApiTags('Project Members')
  @Get(':id/members')
  @ApiOperation({
    summary: 'Получить участников проекта',
    description: 'Возвращает всех участников проекта с их ролями',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список участников',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/ProjectMember' },
    },
  })
  async findMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findMembers(id);
  }

  @ApiTags('Project Members')
  @Post(':id/members')
  @ApiOperation({
    summary: 'Добавить участника в проект',
    description: 'Добавляет пользователя в проект с указанной ролью',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Участник добавлен',
    schema: { $ref: '#/components/schemas/ProjectMember' },
  })
  @ApiResponse({ status: 409, description: 'Пользователь уже в проекте' })
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectsService.addMember(id, dto);
  }

  @ApiTags('Project Members')
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить участника из проекта',
    description: 'Удаляет пользователя из участников проекта',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'userId', type: Number, example: 5 })
  @ApiResponse({ status: 204, description: 'Участник удалён' })
  @ApiResponse({ status: 404, description: 'Участник не найден' })
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.projectsService.removeMember(id, userId);
  }

  // ==================== MAP VIEWS ====================

  @ApiTags('Map Views')
  @Get(':id/map-views')
  @ApiOperation({
    summary: 'Получить сохранённые виды карты',
    description: 'Возвращает сохранённые виды карты для проекта',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список видов карты',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/MapView' },
    },
  })
  async findMapViews(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findMapViews(id);
  }

  @ApiTags('Map Views')
  @Post(':id/map-views')
  @ApiOperation({
    summary: 'Сохранить вид карты',
    description: 'Сохраняет текущий вид карты (центр и зум) для пользователя',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: CreateMapViewDto })
  @ApiResponse({
    status: 201,
    description: 'Вид сохранён',
    schema: { $ref: '#/components/schemas/MapView' },
  })
  async saveMapView(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMapViewDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.saveMapView(id, dto, user.id!);
  }
}
