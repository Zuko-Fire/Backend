// src/modules/project/project.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LandPlot } from './entities/land-plot.entity';
import { MapView } from './entities/map-view.entity';
import { Polygon } from './entities/polygon.entity';
import {
  ProjectMembers,
  ProjectMemberRole,
} from './entities/project-members.entity';
import { Project } from './entities/project.entity';
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

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Polygon) private polygonRepo: Repository<Polygon>,
    @InjectRepository(LandPlot) private landPlotRepo: Repository<LandPlot>,
    @InjectRepository(MapView) private mapViewRepo: Repository<MapView>,
    @InjectRepository(ProjectMembers)
    private membersRepo: Repository<ProjectMembers>,
    private dataSource: DataSource,
  ) {}

  async findAccessibleProjects(userId: number, page = 1, limit = 10) {
    const [projects, total] = await this.projectRepo.findAndCount({
      where: [{ owner_id: userId }, { members: { userId } }],
      // ✅ TypeORM поддерживает вложенные relations через массив
      relations: ['owner', 'members', 'members.user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    return {
      data: projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  // ==================== Только проекты владельца ====================

  async findOwnedProjects(userId: number, page = 1, limit = 10) {
    const queryBuilder = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.polygons', 'polygons')
      .where('project.owner_id = :userId', { userId })
      .andWhere('project.deleted_at IS NULL')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('project.created_at', 'DESC');

    const [projects, total] = await queryBuilder.getManyAndCount();

    return {
      data: projects,
      total,
      page,
      limit,
    };
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
      .orderBy('pm.joined_at', 'DESC');

    const [memberships, total] = await queryBuilder.getManyAndCount();

    return {
      data: memberships.map((pm) => ({
        ...pm.project,
        memberRole: pm.roleInProject,
        joinedAt: pm.joinedAt,
      })),
      total,
      page,
      limit,
    };
  }

  // ==================== Проект по ID с проверкой доступа ====================

  async findOne(id: number, userId?: number) {
    const queryBuilder = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.polygons', 'polygons')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .where('project.id = :id', { id })
      .andWhere('project.deleted_at IS NULL');

    if (userId) {
      queryBuilder.andWhere(
        '(project.owner_id = :userId OR members.user_id = :userId)',
        { userId },
      );
    }

    const project = await queryBuilder.getOne();

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }

  // ==================== CRUD Проектов ====================

  async create(dto: CreateProjectDto, ownerId: number) {
    const project = this.projectRepo.create({
      ...dto,
      owner_id: ownerId, // ← snake_case
    });

    const saved = await this.projectRepo.save(project);

    // Создатель автоматически становится участником с ролью admin
    await this.membersRepo.save({
      projectId: saved.id, // ← snake_case
      userId: ownerId,
      role_in_project: ProjectMemberRole.ADMIN, // ← enum из entity
    });

    return this.findOne(saved.id, ownerId);
  }

  async update(id: number, dto: UpdateProjectDto, userId: number) {
    await this.checkProjectAccess(id, userId, ['admin', 'editor']);

    // ← snake_case: updated_at
    await this.projectRepo.update(id, { ...dto, updatedAt: new Date() });
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // ← snake_case: owner_id
    if (project.owner_id !== userId) {
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

    if (!polygon) throw new NotFoundException('Polygon not found');

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

    const polygon = this.polygonRepo.create({
      ...dto,
      project_id: projectId, // ← snake_case
      created_by: userId,
      updated_by: userId,
    });
    return this.polygonRepo.save(polygon);
  }

  async updatePolygon(id: number, dto: UpdatePolygonDto, userId: number) {
    const polygon = await this.polygonRepo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!polygon) throw new NotFoundException('Polygon not found');

    await this.checkProjectAccess(polygon.project_id, userId, [
      'admin',
      'editor',
    ]);

    // ← snake_case: updated_at
    await this.polygonRepo.update(id, { ...dto, updatedAt: new Date() });
    return this.findPolygon(id, userId);
  }

  async removePolygon(id: number, userId: number) {
    const polygon = await this.polygonRepo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!polygon) throw new NotFoundException('Polygon not found');

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
    const query = this.polygonRepo.createQueryBuilder('polygon').where(
      `ST_DWithin(
          polygon.geometry,
          ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
          :radius
        )`,
      { lat, lon, radius },
    );

    if (userId) {
      query.andWhere(
        '(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))',
        { userId },
      );
    }

    return query.getMany();
  }

  async findPolygonsInArea(dto: GeoSearchDto, userId?: number) {
    const query = this.polygonRepo.createQueryBuilder('polygon').where(
      `ST_Intersects(
          polygon.geometry,
          ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)
        )`,
      {
        minLon: dto.bounds.minLon,
        minLat: dto.bounds.minLat,
        maxLon: dto.bounds.maxLon,
        maxLat: dto.bounds.maxLat,
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
      queryBuilder.where('landPlot.cadastral_number = :cadastral', {
        cadastral,
      });
    }

    if (userId && cadastral) {
      queryBuilder.andWhere(
        '(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))',
        { userId },
      );
    } else if (userId) {
      queryBuilder.where(
        '(polygon.project_id IN (SELECT id FROM projects WHERE owner_id = :userId) OR polygon.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId))',
        { userId },
      );
    }

    return queryBuilder.getMany();
  }

  async findLandPlot(id: number, userId?: number) {
    const plot = await this.landPlotRepo.findOne({
      where: { id },
      relations: ['polygon'],
    });
    if (!plot) throw new NotFoundException('Land plot not found');

    if (userId && plot.polygon?.project_id) {
      await this.checkProjectAccess(plot.polygon.project_id, userId);
    }

    return plot;
  }

  async createLandPlot(dto: CreateLandPlotDto, userId?: number) {
    if (userId && dto.polygon_id) {
      await this.checkProjectAccess(dto.polygon_id, userId, [
        'admin',
        'editor',
      ]);
    }

    const plot = this.landPlotRepo.create(dto);
    return this.landPlotRepo.save(plot);
  }

  // ==================== Участники проекта ====================

  async findMembers(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    // ← snake_case: project_id
    return this.membersRepo.find({
      where: { projectId: projectId },
      relations: ['user'],
    });
  }

  async addMember(projectId: number, dto: AddMemberDto, currentUserId: number) {
    await this.checkProjectAccess(projectId, currentUserId, ['admin']);

    // ← snake_case: project_id, user_id
    const existing = await this.membersRepo.findOne({
      where: { projectId: projectId, userId: dto.userId },
    });

    if (existing) {
      throw new ForbiddenException('User already in project');
    }

    const member = this.membersRepo.create({
      projectId: projectId,
      userId: dto.userId,
      roleInProject: dto.role as unknown as ProjectMemberRole, // ← приведение к enum
    });

    return this.membersRepo.save(member);
  }

  async removeMember(projectId: number, userId: number, currentUserId: number) {
    await this.checkProjectAccess(projectId, currentUserId, ['admin']);

    // ← snake_case: project_id, user_id
    await this.membersRepo.delete({ projectId: projectId, userId: userId });
    return { message: 'Member removed successfully' };
  }

  // ==================== Виды карты ====================

  async findMapViews(projectId: number, userId?: number) {
    if (userId) {
      await this.checkProjectAccess(projectId, userId);
    }

    return this.mapViewRepo.find({
      where: { project_id: projectId },
      relations: ['user'],
    });
  }

  async saveMapView(projectId: number, dto: CreateMapViewDto, userId: number) {
    await this.checkProjectAccess(projectId, userId);

    // ← snake_case: project_id, user_id
    const existing = await this.mapViewRepo.findOne({
      where: { project_id: projectId, user_id: userId },
    });

    if (existing) {
      await this.mapViewRepo.update(existing.id, dto);
      return this.mapViewRepo.findOne({ where: { id: existing.id } });
    }

    const mapView = this.mapViewRepo.create({
      ...dto,
      project_id: projectId,
      user_id: userId,
    });
    return this.mapViewRepo.save(mapView);
  }

  // ==================== 🔐 Проверка доступа ====================

  private async checkProjectAccess(
    projectId: number,
    userId: number,
    allowedRoles: string[] = ['admin', 'editor', 'viewer'],
  ) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // ← snake_case: owner_id
    if (project.owner_id === userId) {
      return true;
    }

    // ← snake_case: project_id, user_id
    const membership = await this.membersRepo.findOne({
      where: { projectId: projectId, userId: userId },
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
}
