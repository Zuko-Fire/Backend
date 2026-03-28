import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Polygon as PolygonType, DataSource } from 'typeorm';
import { LandPlot } from './entitiest/land-plot.entity';
import { MapView } from './entitiest/map-view.entity';
import { Polygon } from './entitiest/polygon.entity';
import { ProjectMembers } from './entitiest/project-members.entity';
import { Project } from './entitiest/project.entity';
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

  // === Проекты ===
  async findAll(page: number, limit: number, ownerId?: number) {
    const where = ownerId ? { owner_id: ownerId } : {};
    const [projects, total] = await this.projectRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      relations: ['owner', 'polygons'],
    });
    return { data: projects, total, page, limit };
  }

  async findMyProjects(userId: number) {
    const projects = await this.projectRepo.find({
      where: { owner_id: userId },
      relations: ['polygons'],
    });
    return projects;
  }

  async findOne(id: number) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['owner', 'polygons', 'members'],
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(dto: CreateProjectDto, ownerId: number) {
    const project = this.projectRepo.create({ ...dto, owner_id: ownerId });
    return this.projectRepo.save(project);
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.projectRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.projectRepo.softDelete(id);
    return { message: 'Project deleted successfully' };
  }

  // === Полигоны ===
  async findPolygons(projectId: number) {
    return this.polygonRepo.find({
      where: { project_id: projectId },
      relations: ['landPlots'],
    });
  }

  async findPolygon(id: number) {
    const polygon = await this.polygonRepo.findOne({
      where: { id },
      relations: ['project', 'landPlots'],
    });
    if (!polygon) throw new NotFoundException('Polygon not found');
    return polygon;
  }

  async createPolygon(
    projectId: number,
    dto: CreatePolygonDto,
    userId: number,
  ) {
    const polygon = this.polygonRepo.create({
      ...dto,
      project_id: projectId,
      created_by: userId,
      updated_by: userId,
    });
    return this.polygonRepo.save(polygon);
  }

  async updatePolygon(id: number, dto: UpdatePolygonDto) {
    await this.polygonRepo.update(id, { ...dto, updatedAt: new Date() });
    return this.findPolygon(id);
  }

  async removePolygon(id: number) {
    await this.polygonRepo.softDelete(id);
    return { message: 'Polygon deleted successfully' };
  }

  // === Гео-запросы с PostGIS ===
  async findPolygonsNearPoint(lat: number, lon: number, radius: number) {
    return this.polygonRepo
      .createQueryBuilder('polygon')
      .where(
        `
        ST_DWithin(
          polygon.geometry,
          ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
          :radius
        )
      `,
        { lat, lon, radius },
      )
      .getMany();
  }

  async findPolygonsInArea(dto: GeoSearchDto) {
    return this.polygonRepo
      .createQueryBuilder('polygon')
      .where(
        `
        ST_Intersects(
          polygon.geometry,
          ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)
        )
      `,
        {
          minLon: dto.bounds.minLon,
          minLat: dto.bounds.minLat,
          maxLon: dto.bounds.maxLon,
          maxLat: dto.bounds.maxLat,
        },
      )
      .getMany();
  }

  // === Земельные участки ===
  async findLandPlots(cadastral?: string) {
    const where = cadastral ? { cadastral_number: cadastral } : {};
    return this.landPlotRepo.find({ where, relations: ['polygon'] });
  }

  async findLandPlot(id: number) {
    const plot = await this.landPlotRepo.findOne({
      where: { id },
      relations: ['polygon'],
    });
    if (!plot) throw new NotFoundException('Land plot not found');
    return plot;
  }

  async createLandPlot(dto: CreateLandPlotDto) {
    const plot = this.landPlotRepo.create(dto);
    return this.landPlotRepo.save(plot);
  }

  // === Участники проекта ===
  async findMembers(projectId: number) {
    return this.membersRepo.find({
      where: { project_id: projectId },
      relations: ['user'],
    });
  }

  async addMember(projectId: number, dto: AddMemberDto) {
    const member = this.membersRepo.create({
      project_id: projectId,
      user_id: dto.userId,
      role_in_project: dto.role,
    });
    return this.membersRepo.save(member);
  }

  async removeMember(projectId: number, userId: number) {
    await this.membersRepo.delete({ project_id: projectId, user_id: userId });
    return { message: 'Member removed successfully' };
  }

  // === Виды карты ===
  async findMapViews(projectId: number) {
    return this.mapViewRepo.find({
      where: { project_id: projectId },
      relations: ['user'],
    });
  }

  async saveMapView(projectId: number, dto: CreateMapViewDto, userId: number) {
    // Обновить существующий или создать новый
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
}
