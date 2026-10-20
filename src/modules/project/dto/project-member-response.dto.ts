import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectMemberResponseDto {
  @ApiProperty({ description: 'Project ID' })
  project_id!: number;

  @ApiProperty({ description: 'User ID' })
  user_id!: number;

  @ApiProperty({ description: 'User role in project', enum: ['viewer', 'editor', 'admin'] })
  roleInProject!: string;

  @ApiProperty({ description: 'Join timestamp' })
  joinedAt!: Date;

  @ApiPropertyOptional({ description: 'User info' })
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}
