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
  Req,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/auth/roles.decorator';
import { RolesGuard } from 'src/common/guards/auth/roles.guard';
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
  ProjectResponseDto,
  PolygonResponseDto,
  LandPlotResponseDto,
  DocumentResponseDto,
  MapViewResponseDto,
  ProjectMemberResponseDto,
  UpdateLandPlotDto,
  CreateLayerFolderDto,
  UpdateLayerFolderDto,
  CreateLayerObjectDto,
  UpdateLayerObjectDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateEventDto,
  UpdateEventDto,
} from './dto';
import { ProjectService } from './project.service';
import { ProjectStatus } from './entities/project.entity';
import { DocumentType } from './entities/document.entity';
import { Document } from './entities/document.entity';
import { User } from 'src/common/decorators/auth/user.decorator';
import { UserDto } from '../users/dto/UserDto';

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private projectsService: ProjectService) {}

  // ==================== 🎯 ГЛАВНЫЙ ЭНДПОИНТ: Доступные проекты ====================

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Получить все проекты (только админы)',
    description:
      'Возвращает ВСЕ проекты в системе, независимо от доступа пользователя',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Список всех проектов',
    type: 'object',
  })
  @ApiResponse({ status: 401, description: 'Неавторизован' })
  @ApiResponse({ status: 403, description: 'Доступ только для админов' })
  async findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.projectsService.findAllProjects(+page, +limit);
  }

  @Get()
  @ApiOperation({
    summary: 'Получить доступные проекты',
    description: 'Возвращает проекты где пользователь = владелец ИЛИ участник',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Список доступных проектов',
    type: 'object',
  })
  @ApiResponse({ status: 401, description: 'Неавторизован' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @User() user: UserDto,
  ) {
    return this.projectsService.findAccessibleProjects(user.id!, +page, +limit);
  }

  // ==================== Только мои проекты (владелец) ====================

  @Get('my')
  @ApiOperation({
    summary: 'Получить мои проекты (только владелец)',
    description:
      'Возвращает проекты где текущий пользователь является владельцем',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Список проектов владельца',
  })
  async findMyProjects(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @User() user: UserDto,
  ) {
    return this.projectsService.findOwnedProjects(user.id!, +page, +limit);
  }

  // ==================== Проекты где я участник ====================

  @Get('member')
  @ApiOperation({
    summary: 'Проекты где я участник',
    description: 'Возвращает проекты где пользователь добавлен как участник',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Список проектов' })
  async findMemberProjects(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @User() user: UserDto,
  ) {
    return this.projectsService.findMemberProjects(user.id!, +page, +limit);
  }

  // ==================== Проект по ID ====================

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
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @ApiResponse({ status: 403, description: 'Нет доступа к проекту' })
  async findOne(@Param('id', ParseIntPipe) id: number, @User() user: UserDto) {
    return this.projectsService.findOne(id, user.id);
  }

  // ==================== Создать проект ====================

  @Post()
  @ApiOperation({
    summary: 'Создать новый проект',
    description: 'Создаёт проект и назначает текущего пользователя владельцем',
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: 201,
    description: 'Проект успешно создан',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async create(@Body() dto: CreateProjectDto, @User() user: UserDto) {
    return this.projectsService.create(dto, user.id!);
  }

  // ==================== Обновить проект ====================

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
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @ApiResponse({ status: 403, description: 'Нет прав на редактирование' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.update(id, dto, user.id!);
  }

  // ==================== Удалить проект ====================

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
  async remove(@Param('id', ParseIntPipe) id: number, @User() user: UserDto) {
    return this.projectsService.remove(id, user.id!);
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
    type: [PolygonResponseDto],
  })
  async findPolygons(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.findPolygons(id, user.id);
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
    type: PolygonResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректный GeoJSON' })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @ApiResponse({ status: 403, description: 'Нет прав' })
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
    type: PolygonResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Полигон не найден' })
  async findPolygon(
    @Param('polygonId', ParseIntPipe) polygonId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.findPolygon(polygonId, user.id);
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
    type: PolygonResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Нет прав' })
  async updatePolygon(
    @Param('polygonId', ParseIntPipe) polygonId: number,
    @Body() dto: UpdatePolygonDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.updatePolygon(polygonId, dto, user.id!);
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
  @ApiResponse({ status: 403, description: 'Нет прав' })
  async removePolygon(
    @Param('polygonId', ParseIntPipe) polygonId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.removePolygon(polygonId, user.id!);
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
    type: [PolygonResponseDto],
  })
  async findPolygonsNear(
    @Query() dto: GeoNearSearchDto,
    @User() user: UserDto,
  ) {
    if (dto.radius > 100000) {
      throw new BadRequestException('Максимальный радиус 100км');
    }
    return this.projectsService.findPolygonsNearPoint(
      dto.lat,
      dto.lon,
      dto.radius,
      user.id,
    );
  }

  @ApiTags('Polygons')
  @Get('polygons/search/intersects')
  @ApiOperation({
    summary: 'Поиск полигонов в области',
    description:
      'Использует PostGIS ST_Intersects для поиска пересекающихся полигонов',
  })
  @ApiQuery({ type: GeoSearchDto })
  @ApiResponse({
    status: 200,
    description: 'Найденные полигоны',
    type: [PolygonResponseDto],
  })
  async findPolygonsIntersects(
    @Query() dto: GeoSearchDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.findPolygonsInArea(dto, user.id);
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
    type: [LandPlotResponseDto],
  })
  async findLandPlots(@Req() req: any) {
    const cadastral = req.query.cadastral_number as string | undefined;
    const user = req.user as UserDto;
    return this.projectsService.findLandPlots(cadastral, user?.id);
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
    type: LandPlotResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Кадастровый номер уже существует' })
  async createLandPlot(@Body() dto: CreateLandPlotDto, @User() user: UserDto) {
    return this.projectsService.createLandPlot(dto, user.id);
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
    type: LandPlotResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Участок не найден' })
  async findLandPlot(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.findLandPlot(id, user.id);
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
    type: [ProjectMemberResponseDto],
  })
  async findMembers(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.findMembers(id, user.id);
  }

  @ApiTags('Project Members')
  @Post(':id/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Добавить участника в проект',
    description: 'Только админы могут добавлять участников в проект',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Участник добавлен',
    type: ProjectMemberResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Пользователь уже в проекте' })
  @ApiResponse({ status: 403, description: 'Доступ только для админов' })
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.addMember(id, dto, user.id!);
  }

  @ApiTags('Project Members')
  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить участника из проекта',
    description: 'Только админы могут удалять участников из проекта',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'userId', type: Number, example: 5 })
  @ApiResponse({ status: 204, description: 'Участник удалён' })
  @ApiResponse({ status: 404, description: 'Участник не найден' })
  @ApiResponse({ status: 403, description: 'Доступ только для админов' })
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.removeMember(id, userId, user.id!);
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
    type: [MapViewResponseDto],
  })
  async findMapViews(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.findMapViews(id, user.id);
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
    type: MapViewResponseDto,
  })
  async saveMapView(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMapViewDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.saveMapView(id, dto, user.id!);
  }

  // ==================== STATUS WORKFLOW ====================

  @ApiTags('Project Status')
  @Put(':id/status')
  @ApiOperation({
    summary: 'Изменить статус проекта',
    description:
      'Управление жизненным циклом проекта: черновик → на проверке → утверждён/возвращён',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { enum: ['draft', 'in_review', 'approved', 'returned'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Статус изменён' })
  @ApiResponse({ status: 400, description: 'Недопустимый переход статуса' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { status: ProjectStatus },
    @User() user: UserDto,
  ) {
    return this.projectsService.updateProjectStatus(id, dto.status, user.id!);
  }

  @ApiTags('Project Status')
  @Post(':id/copy')
  @ApiOperation({
    summary: 'Сохранить копию проекта',
    description: 'Создаёт копию проекта с новым ID и статусом черновика',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 201, description: 'Проект скопирован' })
  async saveProjectCopy(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.saveProjectCopy(id, user.id!);
  }

  // ==================== DOCUMENTS ====================

  @ApiTags('Documents')
  @Post(':id/documents')
  @ApiOperation({ summary: 'Загрузить документ в проект' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: [
            'assignment',
            'right_document',
            'extract_egrp',
            'boundary_agreement',
            'survey_data',
            'photo',
            'other',
          ],
        },
        filePath: { type: 'string' },
        fileSize: { type: 'number', nullable: true },
        mimeType: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Документ загружен',
    type: DocumentResponseDto,
  })
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      name: string;
      type: DocumentType;
      filePath: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
    },
    @User() user: UserDto,
  ) {
    return this.projectsService.uploadDocument(id, dto, user.id!);
  }

  @ApiTags('Documents')
  @Get(':id/documents')
  @ApiOperation({ summary: 'Получить документы проекта' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список документов',
    type: [DocumentResponseDto],
  })
  async getProjectDocuments(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getProjectDocuments(id, user.id!);
  }

  @ApiTags('Documents')
  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Получить документ по ID' })
  @ApiParam({ name: 'documentId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Документ найден',
    type: DocumentResponseDto,
  })
  async getDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getDocumentById(documentId, user.id!);
  }

  @ApiTags('Documents')
  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить документ' })
  @ApiParam({ name: 'documentId', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Документ удалён' })
  async deleteDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.deleteDocument(documentId, user.id!);
  }

  // ==================== LAYER FOLDERS ====================

  @ApiTags('Layer Folders')
  @Get(':id/folders')
  @ApiOperation({
    summary: 'Получить иерархию папок слоёв',
    description: 'Возвращает древовидную структуру папок и слоёв проекта',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Дерево папок слоёв',
    type: [Object],
  })
  async getLayerFolders(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getLayerFolders(id, user.id!);
  }

  @ApiTags('Layer Folders')
  @Post(':id/folders')
  @ApiOperation({
    summary: 'Создать папку/слой',
    description: 'Добавляет новую папку или слой в иерархию проекта',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: CreateLayerFolderDto })
  @ApiResponse({ status: 201, description: 'Папка создана' })
  async createLayerFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLayerFolderDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.createLayerFolder(id, dto, user.id!);
  }

  @ApiTags('Layer Folders')
  @Put('folders/:folderId')
  @ApiOperation({
    summary: 'Обновить папку/слой',
    description: 'Обновляет название, порядок, видимость папки или слоя',
  })
  @ApiParam({ name: 'folderId', type: Number, example: 1 })
  @ApiBody({ type: UpdateLayerFolderDto })
  @ApiResponse({ status: 200, description: 'Папка обновлена' })
  async updateLayerFolder(
    @Param('folderId', ParseIntPipe) folderId: number,
    @Body() dto: UpdateLayerFolderDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.updateLayerFolder(folderId, dto, user.id!);
  }

  @ApiTags('Layer Folders')
  @Delete('folders/:folderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить папку/слой',
    description: 'Удаляет папку и все вложенные папки/слои',
  })
  @ApiParam({ name: 'folderId', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Папка удалена' })
  async removeLayerFolder(
    @Param('folderId', ParseIntPipe) folderId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.removeLayerFolder(folderId, user.id!);
  }

  // ==================== COMMENTS ====================

  @ApiTags('Comments')
  @Get(':id/comments')
  @ApiOperation({
    summary: 'Получить комментарии проекта',
    description: 'Возвращает все комментарии (точки на карте с замечаниями)',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список комментариев',
    type: [Object],
  })
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getComments(id, user.id);
  }

  @ApiTags('Comments')
  @Post(':id/comments')
  @ApiOperation({
    summary: 'Добавить комментарий на карту',
    description: 'Создаёт точку на карте с текстом замечания',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Комментарий создан' })
  async createComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.createComment(id, dto, user.id!);
  }

  @ApiTags('Comments')
  @Put('comments/:commentId')
  @ApiOperation({
    summary: 'Обновить комментарий',
    description: 'Изменяет текст, координаты или статус комментария',
  })
  @ApiParam({ name: 'commentId', type: Number, example: 1 })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: 'Комментарий обновлён' })
  async updateComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.updateComment(commentId, dto, user.id!);
  }

  @ApiTags('Comments')
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить комментарий' })
  @ApiParam({ name: 'commentId', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Комментарий удалён' })
  async removeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.removeComment(commentId, user.id!);
  }

  // ==================== EVENTS ====================

  @ApiTags('Events')
  @Get(':id/events')
  @ApiOperation({
    summary: 'Получить события проекта',
    description: 'Возвращает все события (заметки, дедлайны, вехи)',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список событий',
    type: [Object],
  })
  async getEvents(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getEvents(id, user.id);
  }

  @ApiTags('Events')
  @Post(':id/events')
  @ApiOperation({
    summary: 'Создать событие',
    description: 'Добавляет заметку, дедлайн или веху в проект',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({ status: 201, description: 'Событие создано' })
  async createEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEventDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.createEvent(id, dto, user.id!);
  }

  @ApiTags('Events')
  @Put('events/:eventId')
  @ApiOperation({
    summary: 'Обновить событие',
    description: 'Изменяет заголовок, описание, дедлайн или статус события',
  })
  @ApiParam({ name: 'eventId', type: Number, example: 1 })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({ status: 200, description: 'Событие обновлено' })
  async updateEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: UpdateEventDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.updateEvent(eventId, dto, user.id!);
  }

  @ApiTags('Events')
  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить событие' })
  @ApiParam({ name: 'eventId', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Событие удалено' })
  async removeEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.removeEvent(eventId, user.id!);
  }

  // ==================== LAYER OBJECTS (Figma/Photoshop style) ====================

  @ApiTags('Layer Objects')
  @Get('layers/:layerFolderId/objects')
  @ApiOperation({
    summary: 'Получить объекты слоя',
    description:
      'Возвращает все полигоны на слое/папке с их свойствами (видимость, прозрачность, порядок)',
  })
  @ApiParam({ name: 'layerFolderId', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Список объектов слоя',
    type: [Object],
  })
  async getLayerObjects(
    @Param('layerFolderId', ParseIntPipe) layerFolderId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getLayerObjects(layerFolderId, user.id!);
  }

  @ApiTags('Layer Objects')
  @Post('layers/:layerFolderId/objects')
  @ApiOperation({
    summary: 'Добавить объект на слой',
    description:
      'Добавляет полигон как объект на слой/папку (как добавление фигуры на слой в Figma/Photoshop)',
  })
  @ApiParam({ name: 'layerFolderId', type: Number, example: 1 })
  @ApiBody({ type: CreateLayerObjectDto })
  @ApiResponse({ status: 201, description: 'Объект добавлен на слой' })
  async createLayerObject(
    @Param('layerFolderId', ParseIntPipe) layerFolderId: number,
    @Body() dto: CreateLayerObjectDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.createLayerObject(
      layerFolderId,
      { ...dto, layerFolderId },
      user.id!,
    );
  }

  @ApiTags('Layer Objects')
  @Put('layer-objects/:layerObjectId')
  @ApiOperation({
    summary: 'Обновить свойства объекта на слое',
    description:
      'Изменяет имя, видимость, прозрачность, порядок объекта на слое',
  })
  @ApiParam({ name: 'layerObjectId', type: Number, example: 1 })
  @ApiBody({ type: UpdateLayerObjectDto })
  @ApiResponse({ status: 200, description: 'Объект обновлён' })
  async updateLayerObject(
    @Param('layerObjectId', ParseIntPipe) layerObjectId: number,
    @Body() dto: UpdateLayerObjectDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.updateLayerObject(
      layerObjectId,
      dto,
      user.id!,
    );
  }

  @ApiTags('Layer Objects')
  @Delete('layer-objects/:layerObjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить объект со слоя',
    description:
      'Удаляет полигон со слоя (не удаляет сам полигон из проекта)',
  })
  @ApiParam({ name: 'layerObjectId', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Объект удалён со слоя' })
  async removeLayerObject(
    @Param('layerObjectId', ParseIntPipe) layerObjectId: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.removeLayerObject(layerObjectId, user.id!);
  }

  @ApiTags('Layer Objects')
  @Get(':id/layer-objects')
  @ApiOperation({
    summary: 'Получить все объекты слоёв проекта',
    description:
      'Возвращает все объекты всех слоёв проекта, сгруппированные по слоям',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Объекты слоёв, сгруппированные по layerFolderId',
    type: [Object],
  })
  async getProjectLayerObjects(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserDto,
  ) {
    return this.projectsService.getProjectLayerObjects(id, user.id!);
  }

  // ==================== LAND PLOT UPDATE ====================

  @ApiTags('LandPlots')
  @Put('land-plots/:id')
  @ApiOperation({
    summary: 'Редактировать земельный участок',
    description: 'Обновляет все поля земельного участка',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateLandPlotDto })
  @ApiResponse({
    status: 200,
    description: 'Участок обновлён',
    type: LandPlotResponseDto,
  })
  async updateLandPlot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLandPlotDto,
    @User() user: UserDto,
  ) {
    return this.projectsService.updateLandPlot(id, dto, user.id!);
  }

  // ==================== ENHANCED GEO SEARCH ====================

  @ApiTags('Polygons')
  @Get('polygons/search/nearest')
  @ApiOperation({
    summary: 'Поиск ближайших полигонов (включая скрытые)',
    description:
      'Возвращает ближайшие к точке полигоны, отсортированные по расстоянию. Включает все полигоны, даже из проектов без доступа.',
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
    name: 'limit',
    type: Number,
    description: 'Максимальное количество результатов',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Ближайшие полигоны',
    type: [PolygonResponseDto],
  })
  async findNearestPolygons(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
    @Query('limit') limit = 20,
  ) {
    return this.projectsService.findNearestPolygons(lat, lon, limit);
  }

  @ApiTags('Polygons')
  @Post('polygons/search/intersections')
  @ApiOperation({
    summary: 'Проверка на пересечения полигонов',
    description:
      'Проверяет, пересекается ли указанный полигон с существующими полигонами в системе',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        coordinates: {
          type: 'array',
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
        },
        excludePolygonId: {
          type: 'number',
          nullable: true,
          description: 'Исключить полигон из проверки (при обновлении)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки пересечений',
    schema: {
      type: 'object',
      properties: {
        intersects: { type: 'boolean' },
        count: { type: 'number' },
        polygons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              project_id: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async checkPolygonIntersections(@Body() body: any) {
    if (!body.coordinates) {
      throw new BadRequestException('coordinates body is required');
    }
    return this.projectsService.checkPolygonIntersections(
      body.coordinates,
      body.excludePolygonId,
    );
  }
}
