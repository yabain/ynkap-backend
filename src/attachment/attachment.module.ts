import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Models
import { Attachment, AttachmentSchema } from './models/attachment.schema';

// Controllers
import { AttachmentController } from './controllers/attachment.controller';

// Services
import { AttachmentService } from './services/attachment.service';
import { GoogleCloudStorageService } from './services/google-cloud-storage.service';
import { FileValidationService } from './services/file-validation.service';
import { ThumbnailService } from './services/thumbnail.service';

// Shared modules
import { SharedModule } from '../shared/shared.module';
import { TicketModule } from '../ticket/ticket.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    // Mongoose models
    MongooseModule.forFeature([
      {
        name: Attachment.name,
        schema: AttachmentSchema
      }
    ]),
    
    // Multer configuration for file uploads
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        dest: './uploads/temp', // Temporary storage before uploading to GCS
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB max file size
          files: 10 // Max 10 files per request
        },
        fileFilter: (req, file, callback) => {
          // Basic file type validation (more detailed validation in service)
          const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
            'audio/mp3', 'audio/wav', 'audio/ogg'
          ];
          
          if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error(`File type ${file.mimetype} not allowed`), false);
          }
        }
      })
    }),
    
    // Other modules
    SharedModule,
    HttpModule,
    
    // Forward references to avoid circular dependencies
    TicketModule,
    MessageModule
  ],
  
  controllers: [AttachmentController],
  
  providers: [
    AttachmentService,
    GoogleCloudStorageService,
    FileValidationService,
    ThumbnailService
  ],
  
  exports: [
    AttachmentService,
    GoogleCloudStorageService
  ]
})
export class AttachmentModule {}
