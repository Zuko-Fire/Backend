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
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreatePolygonDto,
  UpdatePolygonDto,
  GeoSearchDto,
  CreateLandPlotDto,
  AddMemberDto,
  CreateMapViewDto,
} from './dto';
import {
  sanitizeOwner,
  sanitizeMemberUser,
} from 'src/common/utils/sanitize';
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
        landPlots: polygon.landPlots?.map((lp: any) => ({
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
  private serializeCoordinates(dto: CreatePolygonDto | UpdatePolygonDto): string {
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

    await this.checkProjectAccess((polygon as any)[DB.POLYGON.PROJECT_ID], userId, [
      'admin',
      'editor',
    ]);

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

      updates.push(`coordinates = $${paramIndex}, geometry = $${paramIndex + 1}`);
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
      const projectAccessCondition =
        `(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))`;
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
      registration_date: dto.registration_date ? new Date(dto.registration_date) : null,
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
      throw new ForbiddenException('Only owner or lead engineer can change status');
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
}
