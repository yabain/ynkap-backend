import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAttachmentDto } from './create-attachment.dto';

export class UpdateAttachmentDto extends PartialType(CreateAttachmentDto) {
  @ApiPropertyOptional({
    description: 'Updated original filename',
    example: 'updated-document.pdf'
  })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({
    description: 'Updated thumbnail URL',
    example: 'https://storage.googleapis.com/bucket/thumbnails/image_150x150.jpg'
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the attachment is publicly accessible',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Updated metadata for the attachment'
  })
  @IsOptional()
  metadata?: any;
}
