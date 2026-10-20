import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty({ description: 'Unique document identifier' })
  id!: number;

  @ApiProperty({ description: 'Document name' })
  name!: string;

  @ApiProperty({ description: 'Document type' })
  type!: string;

  @ApiProperty({ description: 'File path or URL' })
  filePath!: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType!: string;

  @ApiProperty({ description: 'Project ID' })
  project_id!: number;

  @ApiPropertyOptional({ description: 'Land plot ID' })
  land_plot_id?: number;

  @ApiProperty({ description: 'Uploaded by user ID' })
  uploaded_by!: number;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt!: Date;

  @ApiPropertyOptional({ description: 'Document description' })
  description?: string;
}
