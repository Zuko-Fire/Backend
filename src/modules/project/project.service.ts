// src/modules/project/project.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { LandPlot } from './entities/land-plot.entity';
import { MapView } from './entities/map-view.entity';
import { Polygon } from './entities/polygon.entity';
import {
  ProjectMembers,
  ProjectMemberRole,
} from './entities/project-members.entity';
import { Project, ProjectStatus } from './entities/project.entity';
import { Document, DocumentType } from './entities/document.entity';
import { LayerFolder, LayerFolderType } from './entities/layer-folder.entity';
import { LayerObject } from './entities/layer-object.entity';
import { Comment } from './entities/comment.entity';
import { Event, EventType } from './entities/event.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreatePolygonDto,
  UpdatePolygonDto,
  GeoSearchDto,
  CreateLandPlotDto,
  AddMemberDto,
  CreateMapViewDto,
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
import { sanitizeOwner, sanitizeMemberUser } from 'src/common/utils/sanitize';
import { User } from 'src/modules/users/entities/user.entity';
import { paginate } from 'src/common/utils/pagination';
import {
  POSTGIS_SRID,
  MAX_SEARCH_RADIUS_METERS,
  STATUS_TRANSITIONS,
  DB,
} from 'src/common/constants';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Polygon) private polygonRepo: Repository<Polygon>,
    @InjectRepository(LandPlot) private landPlotRepo: Repository<LandPlot>,
    @InjectRepository(MapView) private mapViewRepo: Repository<MapView>,
    @InjectRepository(ProjectMembers)
    private membersRepo: Repository<ProjectMembers>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(LayerFolder)
    private layerFolderRepo: Repository<LayerFolder>,
    @InjectRepository(LayerObject)
    private layerObjectRepo: Repository<LayerObject>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private dataSource: DataSource,
  ) {}

  // ==================== Все проекты (только для админов) ====================

  async findAllProjects(page = 1, limit = 10) {
    const [projects, total] = await this.projectRepo.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['owner', 'members', 'members.user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    const sanitizedProjects = projects.map((project) =>
      this.sanitizeProjectWithMembers(project as any),
    );

    return paginate(sanitizedProjects, total, page, limit);
  }

  async findAccessibleProjects(userId: number, page = 1, limit = 10) {
    const [projects, total] = await this.projectRepo.findAndCount({
      where: [{ [DB.PROJECT.OWNER_ID]: userId }, { members: { userId } }],
      relations: ['owner', 'members', 'members.user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    const sanitizedProjects = projects.map((project) =>
      this.sanitizeProjectWithMembers(project as any),
    );

    return paginate(sanitizedProjects, total, page, limit);
  }
  // ==================== Только проекты владельца ====================

  async findOwnedProjects(userId: number, page = 1, limit = 10) {
    const queryBuilder = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.polygons', 'polygons')
      .where(`project.${DB.PROJECT.OWNER_ID} = :userId`, { userId })
      .andWhere('project.deleted_at IS NULL')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('project.createdAt', 'DESC');

    const [projects, total] = await queryBuilder.getManyAndCount();

    const sanitizedProjects = projects.map((project) => ({
      ...project,
      owner: sanitizeOwner(project.owner as any),
    }));

    return paginate(sanitizedProjects, total, page, limit);
  }

  // ==================== Только проекты где участник ====================

  async findMemberProjects(userId: number, page = 1, limit = 10) {
    const queryBuilder = this.membersRepo
      .createQueryBuilder('pm')
      .innerJoinAndSelect('pm.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.polygons', 'polygons')
      .where('pm.user_id = :userId', { userId })
      .andWhere('project.deleted_at IS NULL')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('pm.joinedAt', 'DESC');

    const [memberships, total] = await queryBuilder.getManyAndCount();

    const sanitizedData = memberships.map((pm) => {
      const project = pm.project as any;
      return {
        ...project,
        owner: sanitizeOwner(project.owner),
        memberRole: pm.roleInProject,
        joinedAt: pm.joinedAt,
      };
    });

    return paginate(sanitizedData, total, page, limit);
  }

  // ==================== Проект по ID с проверкой доступа ====================

  async findOne(id: number, userId?: number) {
    const queryBuilder = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.polygons', 'polygons')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .where(`project.${DB.PROJECT.ID} = :id`, { id })
      .andWhere('project.deleted_at IS NULL');

    if (userId) {
      queryBuilder.andWhere(
        `(project.${DB.PROJECT.OWNER_ID} = :userId OR members.user_id = :userId)`,
        { userId },
      );
    }

    const project = await queryBuilder.getOne();

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return this.sanitizeProject(project);
  }

  // ==================== Вспомогательные методы ====================

  /**
   * Sanitizes all user data in a project (owner, members, land plots)
   */
  private sanitizeProject(project: any): any {
    return {
      ...project,
      owner: sanitizeOwner(project.owner),
      polygons: project.polygons?.map((polygon: any) => ({
        ...polygon,
        landPlots:
          polygon.landPlots?.map((lp: any) => ({
            ...lp,
            polygon: sanitizeOwner(lp.polygon),
          })) || [],
      })),
      members: project.members?.map((member: any) =>
        sanitizeMemberUser(member),
      ),
    };
  }

  /**
   * Sanitizes project with members (for findAccessibleProjects)
   */
  private sanitizeProjectWithMembers(project: any): any {
    return {
      ...project,
      owner: sanitizeOwner(project.owner),
      members: project.members?.map((member: any) =>
        sanitizeMemberUser(member),
      ),
    };
  }

  /**
   * Generates WKT POLYGON string from GeoJSON coordinates
   */
  private generateWktFromGeoJSON(coordinates: number[][][]): string {
    const wktPoints = coordinates[0]
      .map((p: number[]) => `${p[0]} ${p[1]}`)
      .join(', ');
    return `POLYGON((${wktPoints}))`;
  }

  /**
   * Serializes GeoJSON coordinates to JSON string
   */
  private serializeCoordinates(
    dto: CreatePolygonDto | UpdatePolygonDto,
  ): string {
    const coordsAny = dto.coordinates as any;
    return JSON.stringify({
      type: coordsAny.type,
      coordinates: coordsAny.coordinates,
    });
  }

  // ==================== CRUD Проектов ====================

  async create(dto: CreateProjectDto, ownerId: number) {
    const project = this.projectRepo.create({
      ...dto,
      [DB.PROJECT.OWNER_ID]: ownerId,
    });

    const saved = await this.projectRepo.save(project);

    // Creator becomes admin automatically
    await this.membersRepo.save({
      projectId: saved.id,
      userId: ownerId,
      role_in_project: ProjectMemberRole.ADMIN,
    });

    return this.findOne(saved.id, ownerId);
  }

  async update(id: number, dto: UpdateProjectDto, userId: number) {
    await this.checkProjectAccess(id, userId, ['admin', 'editor']);
    await this.projectRepo.update(id, { ...dto, updatedAt: new Date() });
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if ((project as any)[DB.PROJECT.OWNER_ID] !== userId) {
      throw new ForbiddenException('Only owner can delete project');
    }

    await this.projectRepo.softDelete(id);
    return { message: 'Project deleted successfully' };
  }

  // ==================== Полигоны ====================

  async findPolygons(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    // ← snake_case: project_id
    return this.polygonRepo.find({
      where: { project_id: projectId },
      relations: ['landPlots'],
    });
  }

  async findPolygon(id: number, userId?: number) {
    const polygon = await this.polygonRepo.findOne({
      where: { id },
      relations: ['project', 'landPlots'],
    });

    if (!polygon || polygon.deletedAt) {
      throw new NotFoundException('Polygon not found');
    }

    // ← snake_case: project_id
    if (userId && polygon.project_id) {
      await this.checkProjectAccess(polygon.project_id, userId);
    }

    return polygon;
  }

  async createPolygon(
    projectId: number,
    dto: CreatePolygonDto,
    userId: number,
  ) {
    await this.checkProjectAccess(projectId, userId, ['admin', 'editor']);

    const coordinatesStr = this.serializeCoordinates(dto);
    const geometryWkt = this.generateWktFromGeoJSON(
      (dto.coordinates as any).coordinates,
    );

    const result = await this.polygonRepo.query(
      `INSERT INTO polygons (name, coordinates, project_id, created_by, updated_by, geometry, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [dto.name, coordinatesStr, projectId, userId, userId, geometryWkt],
    );
    return result[0];
  }

  async updatePolygon(id: number, dto: UpdatePolygonDto, userId: number) {
    const polygon = await this.polygonRepo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!polygon || polygon.deletedAt) {
      throw new NotFoundException('Polygon not found');
    }

    await this.checkProjectAccess(
      (polygon as any)[DB.POLYGON.PROJECT_ID],
      userId,
      ['admin', 'editor'],
    );

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(dto.name);
      paramIndex++;
    }

    if (dto.coordinates !== undefined) {
      const coordinatesStr = this.serializeCoordinates(dto);
      const geometryWkt = this.generateWktFromGeoJSON(
        (dto.coordinates as any).coordinates,
      );

      updates.push(
        `coordinates = $${paramIndex}, geometry = $${paramIndex + 1}`,
      );
      params.push(coordinatesStr, geometryWkt);
      paramIndex += 2;
    }

    updates.push(`updated_by = $${paramIndex}, updated_at = NOW()`);
    params.push(userId);
    paramIndex++;

    updates.push(`id = $${paramIndex}`);
    params.push(id);

    await this.polygonRepo.query(
      `UPDATE polygons SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    return this.findPolygon(id, userId);
  }

  async removePolygon(id: number, userId: number) {
    const polygon = await this.polygonRepo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!polygon || polygon.deletedAt) {
      throw new NotFoundException('Polygon not found');
    }

    await this.checkProjectAccess(polygon.project_id, userId, ['admin']);

    await this.polygonRepo.softDelete(id);
    return { message: 'Polygon deleted successfully' };
  }

  // ==================== Гео-запросы с PostGIS ====================

  async findPolygonsNearPoint(
    lat: number,
    lon: number,
    radius: number,
    userId?: number,
  ) {
    if (radius > MAX_SEARCH_RADIUS_METERS) {
      throw new BadRequestException(
        `Radius cannot exceed ${MAX_SEARCH_RADIUS_METERS} meters`,
      );
    }

    const query = this.polygonRepo.createQueryBuilder('polygon').where(
      `ST_DWithin(
          polygon.geometry::geometry,
          ST_SetSRID(ST_MakePoint(:lon, :lat), ${POSTGIS_SRID}),
          :radius
        )`,
      { lat, lon, radius },
    );

    if (userId) {
      query.andWhere(
        `(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))`,
        { userId },
      );
    }

    return query.getMany();
  }

  async findPolygonsInArea(dto: GeoSearchDto, userId?: number) {
    const query = this.polygonRepo.createQueryBuilder('polygon').where(
      `ST_Intersects(
          polygon.geometry::geometry,
          ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)
        )`,
      {
        minLon: dto.minLon,
        minLat: dto.minLat,
        maxLon: dto.maxLon,
        maxLat: dto.maxLat,
      },
    );

    if (userId) {
      query.andWhere(
        '(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))',
        { userId },
      );
    }

    return query.getMany();
  }

  // ==================== Земельные участки ====================

  async findLandPlots(cadastral?: string, userId?: number) {
    const queryBuilder = this.landPlotRepo
      .createQueryBuilder('landPlot')
      .leftJoinAndSelect('landPlot.polygon', 'polygon');

    if (cadastral) {
      queryBuilder.where(
        `landPlot.${DB.LAND_PLOT.CADASTRAL_NUMBER} = :cadastral`,
        { cadastral },
      );
    } else if (userId) {
      const projectAccessCondition = `(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))`;
      queryBuilder.andWhere(projectAccessCondition, { userId });
    }

    return queryBuilder.getMany();
  }

  async findLandPlot(id: number, userId?: number) {
    const plot = await this.landPlotRepo.findOne({
      where: { id },
      relations: ['polygon'],
    });
    if (!plot) throw new NotFoundException('Land plot not found');

    const polygon = plot.polygon as any | undefined;
    if (userId && polygon?.[DB.POLYGON.PROJECT_ID]) {
      await this.checkProjectAccess(
        polygon[DB.POLYGON.PROJECT_ID] as number,
        userId,
      );
    }

    return plot;
  }

  async createLandPlot(dto: CreateLandPlotDto, userId?: number) {
    // Check for duplicate cadastral number
    if (dto.cadastral_number) {
      const existing = await this.landPlotRepo.findOne({
        where: { [DB.LAND_PLOT.CADASTRAL_NUMBER]: dto.cadastral_number },
      });
      if (existing) {
        throw new BadRequestException('Кадастровый номер уже существует');
      }
    }

    // Check access to the polygon's project if polygon_id is provided
    if (dto.polygon_id) {
      const polygon = await this.polygonRepo.findOne({
        where: { id: dto.polygon_id },
        relations: ['project'],
      });
      if (!polygon) {
        throw new NotFoundException('Polygon not found');
      }
      await this.checkProjectAccess(
        (polygon as any)[DB.POLYGON.PROJECT_ID],
        userId!,
        ['admin', 'editor'],
      );
    }

    const plot = this.landPlotRepo.create({
      [DB.LAND_PLOT.CADASTRAL_NUMBER]: dto.cadastral_number || null,
      area: dto.area ?? null,
      [DB.LAND_PLOT.LAND_CATEGORY]: dto.land_category || null,
      [DB.LAND_PLOT.PERMITTED_USE]: dto.permitted_use || null,
      address: dto.address || null,
      status: dto.status || null,
      registration_date: dto.registration_date
        ? new Date(dto.registration_date)
        : null,
      [DB.LAND_PLOT.POLYGON_ID]: dto.polygon_id || null,
    });
    return this.landPlotRepo.save(plot);
  }

  // ==================== Участники проекта ====================

  async findMembers(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    const members = await this.membersRepo.find({
      where: { projectId: projectId },
      relations: ['user'],
    });

    return members.map((member) => sanitizeMemberUser(member as any));
  }

  async addMember(projectId: number, dto: AddMemberDto, currentUserId: number) {
    await this.checkSystemAdmin(currentUserId);

    const existing = await this.membersRepo.findOne({
      where: {
        projectId: projectId,
        userId: dto.userId,
      },
    });

    if (existing) {
      throw new ForbiddenException('User already in project');
    }

    const member = this.membersRepo.create({
      projectId: projectId,
      userId: dto.userId,
      roleInProject: dto.role as unknown as ProjectMemberRole,
    });

    return this.membersRepo.save(member);
  }

  async removeMember(projectId: number, userId: number, currentUserId: number) {
    await this.checkSystemAdmin(currentUserId);
    await this.membersRepo.delete({
      projectId,
      userId,
    });
    return { message: 'Member removed successfully' };
  }

  // ==================== Виды карты ====================

  async findMapViews(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    const views = await this.mapViewRepo.find({
      where: { project_id: projectId },
      relations: ['user'],
    });

    return views.map((view) => sanitizeMemberUser(view as any));
  }

  async saveMapView(projectId: number, dto: CreateMapViewDto, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    const existing = await this.mapViewRepo.findOne({
      where: {
        [DB.MAP_VIEW.PROJECT_ID]: projectId,
        [DB.MAP_VIEW.USER_ID]: userId,
      },
    });

    if (existing) {
      await this.mapViewRepo.update(existing.id, dto);
      return this.mapViewRepo.findOne({ where: { id: existing.id } });
    }

    const mapView = this.mapViewRepo.create({
      ...dto,
      [DB.MAP_VIEW.PROJECT_ID]: projectId,
      [DB.MAP_VIEW.USER_ID]: userId,
    });
    return this.mapViewRepo.save(mapView);
  }

  // ==================== 🔐 Проверка системного уровня админа ====================

  private async checkSystemAdmin(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('super_admin')) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  // ==================== 🔐 Проверка доступа ====================

  private async checkProjectAccess(
    projectId: number,
    userId: number,
    allowedRoles: string[] = ['admin', 'editor', 'viewer'],
  ) {
    const project = await this.projectRepo.findOne({
      where: { [DB.PROJECT.ID]: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if ((project as any)[DB.PROJECT.OWNER_ID] === userId) {
      return true;
    }

    const membership = await this.membersRepo.findOne({
      where: {
        projectId,
        userId,
      },
    });

    if (
      !membership ||
      !membership.roleInProject ||
      !allowedRoles.includes(membership.roleInProject)
    ) {
      throw new ForbiddenException('Access denied to project');
    }

    return true;
  }

  // ==================== Статус проекта (Workflow) ====================

  async updateProjectStatus(
    projectId: number,
    status: ProjectStatus,
    userId: number,
  ) {
    const project = await this.projectRepo.findOne({
      where: { [DB.PROJECT.ID]: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isOwner = (project as any)[DB.PROJECT.OWNER_ID] === userId;
    const member = await this.membersRepo.findOne({
      where: { projectId, userId },
    });
    const isLeadEngineer = member?.roleInProject === ProjectMemberRole.ADMIN;

    if (!isOwner && !isLeadEngineer) {
      throw new ForbiddenException(
        'Only owner or lead engineer can change status',
      );
    }

    const allowed = STATUS_TRANSITIONS[project.status];
    if (!allowed?.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${project.status} to ${status}`,
      );
    }

    project.status = status;
    await this.projectRepo.save(project);

    return project;
  }

  async saveProjectCopy(projectId: number, userId: number) {
    const project = await this.projectRepo.findOne({
      where: { [DB.PROJECT.ID]: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const copy = this.projectRepo.create({
      name: `${project.name} (копия)`,
      description: project.description,
      picture: project.picture,
      status: ProjectStatus.DRAFT,
      [DB.PROJECT.OWNER_ID]: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.projectRepo.save(copy);

    // Assign user as admin of the copy
    await this.membersRepo.save({
      projectId: saved.id,
      userId,
      role_in_project: ProjectMemberRole.ADMIN,
    });

    return this.findOne(saved.id, userId);
  }

  // ==================== Документы ====================

  async uploadDocument(
    projectId: number,
    dto: {
      name: string;
      type: DocumentType;
      filePath: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
    },
    userId: number,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const documentEntity = new Document();
    documentEntity.name = dto.name;
    documentEntity.type = dto.type;
    documentEntity.filePath = dto.filePath;
    documentEntity.fileSize = dto.fileSize || null;
    documentEntity.mimeType = dto.mimeType || null;
    documentEntity.project_id = projectId;
    documentEntity.land_plot_id = null;
    documentEntity.uploaded_by = userId;
    documentEntity.description = dto.description || null;

    return Document.save(documentEntity);
  }

  async getProjectDocuments(projectId: number, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    const documents = await Document.find({
      where: { project_id: projectId },
      relations: ['uploader'],
      order: { uploadedAt: 'DESC' },
    });

    return documents.map((doc) => ({
      ...doc,
      uploader: sanitizeOwner(doc.uploader),
    }));
  }

  async getDocumentById(documentId: number, userId: number) {
    const doc = await Document.findOne({
      where: { id: documentId },
      relations: ['uploader', 'project'],
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (doc.project_id) {
      await this.checkProjectAccess(doc.project_id, userId);
    }

    return {
      ...doc,
      uploader: sanitizeOwner(doc.uploader),
    };
  }

  async deleteDocument(documentId: number, userId: number) {
    const doc = await Document.findOne({
      where: { id: documentId },
      relations: ['project'],
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    if (!doc.project_id) {
      throw new ForbiddenException('Cannot delete document without project');
    }

    await this.checkProjectAccess(doc.project_id, userId, ['admin']);
    await Document.delete(documentId);
    return { message: 'Document deleted successfully' };
  }

  // ==================== Layer Folders ====================

  async getLayerFolders(projectId: number, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    const folders = await this.layerFolderRepo.find({
      where: { projectId },
      order: { orderIndex: 'ASC' },
    });

    return this.buildFolderTree(folders);
  }

  async createLayerFolder(
    projectId: number,
    dto: CreateLayerFolderDto,
    userId: number,
  ) {
    await this.checkProjectAccess(projectId, userId, ['admin', 'editor']);

    // If parent is specified, check it belongs to the same project
    if (dto.parentId) {
      const parent = await this.layerFolderRepo.findOne({
        where: { id: dto.parentId, projectId },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const folder = this.layerFolderRepo.create({
      ...dto,
      projectId,
    });

    return this.layerFolderRepo.save(folder);
  }

  async updateLayerFolder(
    folderId: number,
    dto: UpdateLayerFolderDto,
    userId: number,
  ) {
    const folder = await this.layerFolderRepo.findOne({
      where: { id: folderId },
      relations: ['project'],
    });

    if (!folder) {
      throw new NotFoundException('Layer folder not found');
    }

    await this.checkProjectAccess(
      (folder as any).projectId,
      userId,
      ['admin', 'editor'],
    );

    if (dto.parentId) {
      const parent = await this.layerFolderRepo.findOne({
        where: { id: dto.parentId },
      });
      if (parent && parent.id === folderId) {
        throw new BadRequestException('Folder cannot be its own parent');
      }
      if (parent && parent.projectId !== folder.projectId) {
        throw new BadRequestException('Parent folder must belong to the same project');
      }
    }

    Object.assign(folder, dto);
    return this.layerFolderRepo.save(folder);
  }

  async removeLayerFolder(folderId: number, userId: number) {
    const folder = await this.layerFolderRepo.findOne({
      where: { id: folderId },
      relations: ['project'],
    });

    if (!folder) {
      throw new NotFoundException('Layer folder not found');
    }

    await this.checkProjectAccess(
      (folder as any).projectId,
      userId,
      ['admin'],
    );

    // Delete children first
    await this.layerFolderRepo.delete({ parentId: folderId });
    await this.layerFolderRepo.delete(folderId);
    return { message: 'Layer folder deleted successfully' };
  }

  /**
   * Build hierarchical tree from flat list of folders
   */
  private buildFolderTree(folders: LayerFolder[]): any[] {
    const folderMap = new Map<number, any>();
    const roots: any[] = [];

    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
      });
    });

    folders.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // ==================== Layer Objects (Figma/Photoshop style) ====================

  /**
   * Get all objects (polygons) on a layer/folder
   * Returns objects with their layer-specific properties (visibility, opacity, etc.)
   */
  async getLayerObjects(layerFolderId: number, userId: number) {
    const folder = await this.layerFolderRepo.findOne({
      where: { id: layerFolderId },
      relations: ['project'],
    });

    if (!folder) {
      throw new NotFoundException('Layer folder not found');
    }

    await this.checkProjectAccess(
      (folder as any)[DB.PROJECT.ID],
      userId,
    );

    return this.layerObjectRepo.find({
      where: { layerFolderId },
      relations: ['polygon', 'user'],
      order: { orderIndex: 'ASC' },
    });
  }

  /**
   * Add a polygon as an object to a layer/folder
   * Like adding a shape layer in Figma/Photoshop
   */
  async createLayerObject(
    projectId: number,
    dto: CreateLayerObjectDto,
    userId: number,
  ) {
    await this.checkProjectAccess(projectId, userId, ['admin', 'editor']);

    // Verify layer folder belongs to this project
    const folder = await this.layerFolderRepo.findOne({
      where: { id: dto.layerFolderId, projectId },
    });
    if (!folder) {
      throw new NotFoundException('Layer folder not found');
    }

    // Verify polygon exists
    const polygon = await this.polygonRepo.findOne({
      where: { id: dto.polygonId },
    });
    if (!polygon) {
      throw new NotFoundException('Polygon not found');
    }

    // Check if this polygon is already on this layer
    const existing = await this.layerObjectRepo.findOne({
      where: { layerFolderId: dto.layerFolderId, polygonId: dto.polygonId },
    });
    if (existing) {
      throw new BadRequestException(
        'Polygon already exists on this layer',
      );
    }

    const layerObject = this.layerObjectRepo.create({
      ...dto,
      layerFolderId: dto.layerFolderId,
      polygonId: dto.polygonId,
      userId,
      isVisible: dto.isVisible ?? true,
      isLocked: dto.isLocked ?? false,
      opacity: dto.opacity ?? 1.0,
    });

    return this.layerObjectRepo.save(layerObject);
  }

  /**
   * Update layer object properties (visibility, opacity, name, etc.)
   */
  async updateLayerObject(
    layerObjectId: number,
    dto: UpdateLayerObjectDto,
    userId: number,
  ) {
    const layerObject = await this.layerObjectRepo.findOne({
      where: { id: layerObjectId },
      relations: ['layerFolder', 'layerFolder.project'],
    });

    if (!layerObject) {
      throw new NotFoundException('Layer object not found');
    }

      await this.checkProjectAccess(
        (layerObject.layerFolder as any).projectId,
        userId,
        ['admin', 'editor'],
      );

    Object.assign(layerObject, dto);
    return this.layerObjectRepo.save(layerObject);
  }

  /**
   * Remove an object from a layer (doesn't delete the polygon itself)
   */
  async removeLayerObject(layerObjectId: number, userId: number) {
    const layerObject = await this.layerObjectRepo.findOne({
      where: { id: layerObjectId },
      relations: ['layerFolder', 'layerFolder.project'],
    });

    if (!layerObject) {
      throw new NotFoundException('Layer object not found');
    }

      await this.checkProjectAccess(
        (layerObject.layerFolder as any).projectId,
        userId,
        ['admin'],
      );

    await this.layerObjectRepo.delete(layerObjectId);
    return { message: 'Layer object removed successfully' };
  }

  /**
   * Get all layer objects for a project, organized by layer/folder
   */
  async getProjectLayerObjects(projectId: number, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    const layerObjects = await this.layerObjectRepo.find({
      where: { layerFolder: { projectId } },
      relations: ['layerFolder', 'polygon', 'user'],
      order: { layerFolder: { orderIndex: 'ASC' }, orderIndex: 'ASC' },
    });

    // Group by layer folder
    const grouped = new Map<number, any[]>();
    layerObjects.forEach((lo) => {
      const folderId = (lo.layerFolder as any).id;
      if (!grouped.has(folderId)) {
        grouped.set(folderId, []);
      }
      grouped.get(folderId)!.push({
        id: lo.id,
        objectName: lo.objectName,
        isVisible: lo.isVisible,
        isLocked: lo.isLocked,
        opacity: lo.opacity,
        orderIndex: lo.orderIndex,
        polygon: {
          id: lo.polygon.id,
          name: lo.polygon.name,
          coordinates: lo.polygon.coordinates,
        },
        user: lo.user,
      });
    });

    return Object.fromEntries(grouped);
  }

  // ==================== Comments ====================

  async getComments(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    return this.commentRepo.find({
      where: { project_id: projectId },
      relations: ['user', 'resolvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async createComment(projectId: number, dto: CreateCommentDto, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    const comment = this.commentRepo.create({
      ...dto,
      project_id: projectId,
      user_id: userId,
      status: dto.status || 'open',
    });

    return this.commentRepo.save(comment);
  }

  async updateComment(
    commentId: number,
    dto: UpdateCommentDto,
    userId: number,
  ) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['project'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.checkProjectAccess(
      (comment as any)[DB.PROJECT.ID],
      userId,
      ['admin', 'editor'],
    );

    if (dto.status === 'resolved') {
      (comment as any).resolved_at = new Date();
      (comment as any).resolved_by = userId;
    }

    Object.assign(comment, dto);
    return this.commentRepo.save(comment);
  }

  async removeComment(commentId: number, userId: number) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['project'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.checkProjectAccess(
      (comment as any)[DB.PROJECT.ID],
      userId,
      ['admin', 'editor'],
    );

    await this.commentRepo.delete(commentId);
    return { message: 'Comment deleted successfully' };
  }

  // ==================== Events ====================

  async getEvents(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    return this.eventRepo.find({
      where: { project_id: projectId },
      relations: ['user'],
      order: { due_date: 'ASC', createdAt: 'DESC' },
    });
  }

  async createEvent(projectId: number, dto: CreateEventDto, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    const event = this.eventRepo.create({
      ...dto,
      project_id: projectId,
      user_id: userId,
    });

    return this.eventRepo.save(event);
  }

  async updateEvent(eventId: number, dto: UpdateEventDto, userId: number) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['project'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.checkProjectAccess(
      (event as any)[DB.PROJECT.ID],
      userId,
      ['admin', 'editor'],
    );

    if (dto.isDone === true) {
      (event as any).done_at = new Date();
    }

    Object.assign(event, dto);
    return this.eventRepo.save(event);
  }

  async removeEvent(eventId: number, userId: number) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['project'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.checkProjectAccess(
      (event as any)[DB.PROJECT.ID],
      userId,
      ['admin'],
    );

    await this.eventRepo.delete(eventId);
    return { message: 'Event deleted successfully' };
  }

  // ==================== Land Plot Update ====================

  async updateLandPlot(id: number, dto: UpdateLandPlotDto, userId: number) {
    const plot = await this.landPlotRepo.findOne({
      where: { id },
      relations: ['polygon', 'project'],
    });

    if (!plot) {
      throw new NotFoundException('Land plot not found');
    }

    // Check access through polygon's project or direct project_id
    const projectId =
      (plot as any).project_id ||
      (plot.polygon && (plot.polygon as any)[DB.POLYGON.PROJECT_ID]);

    if (projectId) {
      await this.checkProjectAccess(projectId, userId, ['admin', 'editor']);
    }

    // Check for duplicate cadastral number if being updated
    if (dto.cadastral_number && dto.cadastral_number !== plot.cadastral_number) {
      const existing = await this.landPlotRepo.findOne({
        where: { [DB.LAND_PLOT.CADASTRAL_NUMBER]: dto.cadastral_number },
      });
      if (existing) {
        throw new BadRequestException('Кадастровый номер уже существует');
      }
    }

    // Update polygon_id relationship
    if (dto.polygon_id !== undefined) {
      if (dto.polygon_id) {
        const polygon = await this.polygonRepo.findOne({
          where: { id: dto.polygon_id },
        });
        if (!polygon) {
          throw new NotFoundException('Polygon not found');
        }
      }
    }

    Object.assign(plot, dto);
    return this.landPlotRepo.save(plot);
  }

  // ==================== Enhanced Polygon Search ====================

  /**
   * Find nearest polygons to a point, ordered by distance
   * Includes all polygons (even from projects user doesn't have access to)
   */
  async findNearestPolygons(
    lat: number,
    lon: number,
    limit: number = 20,
  ) {
    const query = this.polygonRepo
      .createQueryBuilder('polygon')
      .where(
        `ST_DWithin(
          polygon.geometry::geometry,
          ST_SetSRID(ST_MakePoint(:lon, :lat), ${POSTGIS_SRID}),
          :radius
        )`,
      )
      .orderBy(
        `ST_Distance(
          polygon.geometry::geometry,
          ST_SetSRID(ST_MakePoint(:lon, :lat), ${POSTGIS_SRID})
        )`,
        'ASC',
      )
      .limit(limit)
      .setParameters({ lat, lon, radius: MAX_SEARCH_RADIUS_METERS });

    return query.getMany();
  }

  /**
   * Check if a polygon intersects with any existing polygons
   * Returns list of intersecting polygons with intersection details
   */
  async checkPolygonIntersections(
    coordinates: any,
    excludePolygonId?: number,
  ) {
    const wktPoints = coordinates.coordinates[0]
      .map((p: number[]) => `${p[0]} ${p[1]}`)
      .join(', ');
    const wkt = `POLYGON((${wktPoints}))`;

    const query = this.polygonRepo
      .createQueryBuilder('polygon')
      .where('ST_Intersects(polygon.geometry::geometry, ST_GeomFromText(:wkt, 4326))')
      .setParameter('wkt', wkt);

    if (excludePolygonId) {
      query.andWhere('polygon.id != :excludePolygonId', { excludePolygonId });
    }

    const intersectingPolygons = await query.getMany();

    return {
      intersects: intersectingPolygons.length > 0,
      count: intersectingPolygons.length,
      polygons: intersectingPolygons.map((p) => ({
        id: p.id,
        name: p.name,
        project_id: (p as any).project_id,
      })),
    };
  }
}
