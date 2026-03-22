import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermissions } from './entities/role-permissions.entity';
import { UserRoles } from './entities/user-roles.entity';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [
    TypeOrmModule.forFeature([
      User,
      Permission,
      Role,
      RolePermissions,
      UserRoles,
    ]),
  ],
  controllers: [UsersController],
})
export class UsersModule {}
