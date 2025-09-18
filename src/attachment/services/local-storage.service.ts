import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface LocalUploadResult {
  key: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  originalName: string;
}

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly tempDir = path.join(process.cwd(), 'uploads', 'temp');
  private readonly permanentDir = path.join(process.cwd(), 'uploads', 'attachments');
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories(): void {
    [this.tempDir, this.permanentDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`✅ Upload directory created: ${dir}`);
      }
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'chat-attachments'
  ): Promise<LocalUploadResult> {
    try {
      const fileExtension = this.getFileExtension(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.permanentDir, fileName);
      
      fs.writeFileSync(filePath, fileBuffer);
      
      const url = `${this.baseUrl}/uploads/attachments/${fileName}`;
      
      this.logger.log(`✅ File uploaded to permanent storage: ${fileName}`);
      
      return {
        key: fileName,
        url,
        path: filePath,
        size: fileBuffer.length,
        mimeType,
        originalName,
      };
    } catch (error) {
      this.logger.error('❌ Failed to upload file locally:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.permanentDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`✅ File deleted: ${fileName}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('❌ Failed to delete file:', error);
      return false;
    }
  }

  getFileUrl(fileName: string): string {
    return `${this.baseUrl}/uploads/attachments/${fileName}`;
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  getFileTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (this.isImage(mimeType)) return 'image';
    if (this.isVideo(mimeType)) return 'video';
    if (this.isAudio(mimeType)) return 'audio';
    return 'document';
  }
}