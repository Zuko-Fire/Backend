import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { LandPlot } from './entities/land-plot.entity';
import { MapView } from './entities/map-view.entity';
import { Polygon } from './entities/polygon.entity';
import { ProjectMembers } from './entities/project-members.entity';
import { Document } from './entities/document.entity';
import { ProjectService } from './project.service';
import { User } from '../users/entities/user.entity';

@Module({
  controllers: [ProjectController],
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Polygon,
      ProjectMembers,
      MapView,
      LandPlot,
      User,
      Document,
    ]),
  ],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
