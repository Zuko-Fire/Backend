import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entitiest/project.entity';
import { LandPlot } from './entitiest/land-plot.entity';
import { MapView } from './entitiest/map-view.entity';
import { Polygon } from './entitiest/polygon.entity';
import { ProjectMembers } from './entitiest/project-members.entity';

@Module({
  controllers: [ProjectController],
  imports: [
    TypeOrmModule.forFeature([
      Project,
      LandPlot,
      MapView,
      Polygon,
      ProjectMembers,
    ]),
  ],
})
export class ProjectModule {}
