import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { NSPDController } from './nspd.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { LandPlot } from './entities/land-plot.entity';
import { MapView } from './entities/map-view.entity';
import { Polygon } from './entities/polygon.entity';
import { ProjectMembers } from './entities/project-members.entity';
import { Document } from './entities/document.entity';
import { LayerFolder } from './entities/layer-folder.entity';
import { LayerObject } from './entities/layer-object.entity';
import { Comment } from './entities/comment.entity';
import { Event } from './entities/event.entity';
import { ProjectService } from './project.service';
import { NSPDClientService } from './nspd/nspd.client.service';
import { NSPDSearchService } from './nspd/nspd.search.service';
import { NSPDTabService } from './nspd/nspd.tab.service';
import { NSPDService } from './nspd.service';
import { User } from '../users/entities/user.entity';

@Module({
  controllers: [ProjectController, NSPDController],
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Polygon,
      ProjectMembers,
      MapView,
      LandPlot,
      User,
      Document,
      LayerFolder,
      LayerObject,
      Comment,
      Event,
    ]),
  ],
  providers: [
    ProjectService,
    NSPDClientService,
    NSPDSearchService,
    NSPDTabService,
    NSPDService,
  ],
  exports: [
    ProjectService,
    NSPDClientService,
    NSPDSearchService,
    NSPDTabService,
    NSPDService,
  ],
})
export class ProjectModule {}
