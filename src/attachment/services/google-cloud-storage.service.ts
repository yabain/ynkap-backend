import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket, File } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface GCSUploadResult {
  fileName: string;
  url: string;
  bucket: string;
  gcsPath: string;
  size: number;
}

export interface GCSConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: any;
  bucketName: string;
  publicUrl: string;
}

@Injectable()
export class GoogleCloudStorageService {
  private readonly logger = new Logger(GoogleCloudStorageService.name);
  private storage: Storage;
  private bucket: Bucket;
  private config: GCSConfig;

  constructor(private configService: ConfigService) {
    this.initializeGCS();
  }

  /**
   * Initialize Google Cloud Storage
   */
  private initializeGCS(): void {
    try {
      this.config = {
        projectId: this.configService.get<string>('GCS_PROJECT_ID'),
        keyFilename: this.configService.get<string>('GCS_KEY_FILENAME'),
        bucketName: this.configService.get<string>('GCS_BUCKET_NAME'),
        publicUrl: this.configService.get<string>('GCS_PUBLIC_URL') || 'https://storage.googleapis.com'
      };

      // Initialize storage with credentials
      const storageOptions: any = {
        projectId: this.config.projectId
      };

      // Use key file if provided, otherwise use default credentials
      if (this.config.keyFilename) {
        storageOptions.keyFilename = this.config.keyFilename;
      }

      this.storage = new Storage(storageOptions);
      this.bucket = this.storage.bucket(this.config.bucketName);

      this.logger.log(`✅ Google Cloud Storage initialized for bucket: ${this.config.bucketName}`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Cloud Storage
   */
  async uploadFile(
    filePath: string,
    originalName: string,
    mimeType: string,
    folder: string = 'attachments'
  ): Promise<GCSUploadResult> {
    try {
      const fileExtension = path.extname(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const gcsPath = `${folder}/${fileName}`;
      
      this.logger.log(`📤 Uploading file: ${originalName} -> ${gcsPath}`);

      // Create file reference
      const file: File = this.bucket.file(gcsPath);

      // Upload options
      const uploadOptions = {
        metadata: {
          contentType: mimeType,
          metadata: {
            originalName: originalName,
            uploadedAt: new Date().toISOString()
          }
        },
        public: true, // Make file publicly accessible
        resumable: false // For smaller files, use simple upload
      };

      // Upload the file
      await this.bucket.upload(filePath, {
        destination: gcsPath,
        ...uploadOptions
      });

      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Generate public URL
      const publicUrl = `${this.config.publicUrl}/${this.config.bucketName}/${gcsPath}`;

      this.logger.log(`✅ File uploaded successfully: ${publicUrl}`);

      return {
        fileName,
        url: publicUrl,
        bucket: this.config.bucketName,
        gcsPath,
        size: stats.size
      };

    } catch (error) {
      this.logger.error(`❌ Failed to upload file ${originalName}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from Google Cloud Storage
   */
  async deleteFile(gcsPath: string): Promise<boolean> {
    try {
      this.logger.log(`🗑️ Deleting file: ${gcsPath}`);

      const file: File = this.bucket.file(gcsPath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        this.logger.warn(`⚠️ File not found in GCS: ${gcsPath}`);
        return true; // Consider it deleted if it doesn't exist
      }

      // Delete the file
      await file.delete();
      
      this.logger.log(`✅ File deleted successfully: ${gcsPath}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Failed to delete file ${gcsPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate signed URL for temporary access
   */
  async generateSignedUrl(
    gcsPath: string, 
    expirationMinutes: number = 60
  ): Promise<string> {
    try {
      const file: File = this.bucket.file(gcsPath);
      
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + expirationMinutes * 60 * 1000
      };

      const [signedUrl] = await file.getSignedUrl(options);
      
      this.logger.log(`🔗 Generated signed URL for: ${gcsPath}`);
      return signedUrl;

    } catch (error) {
      this.logger.error(`❌ Failed to generate signed URL for ${gcsPath}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata from GCS
   */
  async getFileMetadata(gcsPath: string): Promise<any> {
    try {
      const file: File = this.bucket.file(gcsPath);
      const [metadata] = await file.getMetadata();
      
      return {
        name: metadata.name,
        size: parseInt(metadata.size?.toString() || '0'),
        contentType: metadata.contentType,
        created: metadata.timeCreated,
        updated: metadata.updated,
        etag: metadata.etag,
        md5Hash: metadata.md5Hash
      };

    } catch (error) {
      this.logger.error(`❌ Failed to get metadata for ${gcsPath}:`, error);
      throw error;
    }
  }

  /**
   * Copy file within GCS (useful for creating thumbnails)
   */
  async copyFile(
    sourcePath: string, 
    destinationPath: string
  ): Promise<string> {
    try {
      const sourceFile: File = this.bucket.file(sourcePath);
      const destinationFile: File = this.bucket.file(destinationPath);

      await sourceFile.copy(destinationFile);
      
      const publicUrl = `${this.config.publicUrl}/${this.config.bucketName}/${destinationPath}`;
      
      this.logger.log(`📋 File copied: ${sourcePath} -> ${destinationPath}`);
      return publicUrl;

    } catch (error) {
      this.logger.error(`❌ Failed to copy file ${sourcePath} -> ${destinationPath}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists in GCS
   */
  async fileExists(gcsPath: string): Promise<boolean> {
    try {
      const file: File = this.bucket.file(gcsPath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`❌ Failed to check if file exists ${gcsPath}:`, error);
      return false;
    }
  }

  /**
   * Get GCS configuration for frontend
   */
  getConfig(): Partial<GCSConfig> {
    return {
      bucketName: this.config.bucketName,
      publicUrl: this.config.publicUrl,
      projectId: this.config.projectId
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`🧹 Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup temp file ${filePath}:`, error);
    }
  }
}
