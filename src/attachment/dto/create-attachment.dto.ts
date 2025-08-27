import { IsOptional, IsString, IsBoolean, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MulterFile } from '../types/multer.types';

export class CreateAttachmentDto {
  @ApiPropertyOptional({
    description: 'ID of the message this attachment belongs to',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  @IsMongoId()
  messageId?: string;

  @ApiPropertyOptional({
    description: 'ID of the ticket this attachment belongs to',
    example: '507f1f77bcf86cd799439012'
  })
  @IsOptional()
  @IsMongoId()
  ticketId?: string;

  @ApiPropertyOptional({
    description: 'Whether the attachment is publicly accessible',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the attachment',
    example: { description: 'Screenshot of the issue' }
  })
  @IsOptional()
  metadata?: any;
}

export class UploadFileDto extends CreateAttachmentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload'
  })
  file: MulterFile;
}

export class UploadMultipleFilesDto extends CreateAttachmentDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary'
    },
    description: 'Files to upload'
  })
  files: MulterFile[];
}
