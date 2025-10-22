import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { FileType } from '../models/attachment.schema';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fileType: FileType;
  detectedMimeType?: string;
}

export interface FileValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFiles: number;
  scanForViruses: boolean;
  checkFileSignature: boolean;
}

@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);
  private config: FileValidationConfig;

  // File signatures for validation (magic numbers)
  private readonly FILE_SIGNATURES = {
    // Images
    'image/jpeg': [
      [0xFF, 0xD8, 0xFF],
      [0xFF, 0xD8, 0xFF, 0xE0],
      [0xFF, 0xD8, 0xFF, 0xE1]
    ],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
    ],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
    
    // Documents
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/zip': [
      [0x50, 0x4B, 0x03, 0x04],
      [0x50, 0x4B, 0x05, 0x06],
      [0x50, 0x4B, 0x07, 0x08]
    ],
    
    // Videos
    'video/mp4': [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
    ],
    
    // Audio
    'audio/mp3': [
      [0x49, 0x44, 0x33], // ID3
      [0xFF, 0xFB], // MP3 frame header
      [0xFF, 0xF3], // MP3 frame header
      [0xFF, 0xF2]  // MP3 frame header
    ]
  };

  constructor(private configService: ConfigService) {
    this.initializeConfig();
  }

  /**
   * Initialize validation configuration
   */
  private initializeConfig(): void {
    this.config = {
      maxFileSize: this.configService.get<number>('MAX_FILE_SIZE') || 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        // Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        // Videos
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
        // Audio
        'audio/mp3', 'audio/wav', 'audio/ogg'
      ],
      allowedExtensions: [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv',
        '.zip', '.rar', '.7z',
        '.mp4', '.avi', '.mov', '.wmv',
        '.mp3', '.wav', '.ogg'
      ],
      maxFiles: this.configService.get<number>('MAX_FILES_PER_UPLOAD') || 10,
      scanForViruses: this.configService.get<boolean>('SCAN_FOR_VIRUSES') || false,
      checkFileSignature: this.configService.get<boolean>('CHECK_FILE_SIGNATURE') || true
    };

    this.logger.log('✅ File validation service initialized');
  }

  /**
   * Validate uploaded file
   */
  async validateFile(filePath: string, originalName: string, mimeType: string): Promise<ValidationResult> {
    const errors: string[] = [];
    let detectedFileType: FileType = FileType.OTHER;

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        errors.push('File not found');
        return { isValid: false, errors, fileType: detectedFileType };
      }

      // Get file stats
      const stats = fs.statSync(filePath);

      // 1. File size validation
      if (stats.size > this.config.maxFileSize) {
        const maxSizeMB = Math.round(this.config.maxFileSize / (1024 * 1024));
        errors.push(`File size exceeds ${maxSizeMB}MB limit`);
      }

      if (stats.size === 0) {
        errors.push('File is empty');
      }

      // 2. File extension validation
      const fileExtension = path.extname(originalName).toLowerCase();
      if (!this.config.allowedExtensions.includes(fileExtension)) {
        errors.push(`File extension '${fileExtension}' is not allowed`);
      }

      // 3. MIME type validation
      if (!this.config.allowedMimeTypes.includes(mimeType)) {
        errors.push(`MIME type '${mimeType}' is not allowed`);
      }

      // 4. Determine file type
      detectedFileType = this.getFileType(mimeType);

      // 5. File signature validation (magic number check)
      if (this.config.checkFileSignature) {
        const signatureValid = await this.validateFileSignature(filePath, mimeType);
        if (!signatureValid) {
          errors.push('File signature does not match declared type');
        }
      }

      // 6. Filename validation
      if (!this.isValidFileName(originalName)) {
        errors.push('Invalid filename. Only alphanumeric characters, spaces, dots, hyphens, and underscores are allowed');
      }

      // 7. Security checks
      if (this.isSuspiciousFile(originalName)) {
        errors.push('File appears to be suspicious or potentially harmful');
      }

      // 8. Virus scanning (if enabled)
      if (this.config.scanForViruses) {
        const virusScanResult = await this.scanForViruses(filePath);
        if (!virusScanResult.clean) {
          errors.push(`Virus detected: ${virusScanResult.threat}`);
        }
      }

      const isValid = errors.length === 0;
      
      this.logger.log(`📋 File validation ${isValid ? '✅ passed' : '❌ failed'}: ${originalName}`);
      if (!isValid) {
        this.logger.warn(`Validation errors: ${errors.join(', ')}`);
      }

      return {
        isValid,
        errors,
        fileType: detectedFileType,
        detectedMimeType: mimeType
      };

    } catch (error) {
      this.logger.error(`❌ File validation error for ${originalName}:`, error);
      errors.push('File validation failed due to internal error');
      return { isValid: false, errors, fileType: detectedFileType };
    }
  }

  /**
   * Validate file signature (magic numbers)
   */
  private async validateFileSignature(filePath: string, mimeType: string): Promise<boolean> {
    try {
      const signatures = this.FILE_SIGNATURES[mimeType];
      if (!signatures) {
        // If we don't have signatures for this type, skip validation
        return true;
      }

      const buffer = Buffer.alloc(32); // Read first 32 bytes
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 32, 0);
      fs.closeSync(fd);

      // Check if any signature matches
      return signatures.some(signature => {
        return signature.every((byte, index) => buffer[index] === byte);
      });

    } catch (error) {
      this.logger.error('❌ File signature validation error:', error);
      return false;
    }
  }

  /**
   * Determine file type from MIME type
   */
  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || 
        mimeType.includes('sheet') || mimeType.includes('presentation') || 
        mimeType.includes('text')) return FileType.DOCUMENT;
    if (mimeType.includes('zip') || mimeType.includes('rar') || 
        mimeType.includes('7z')) return FileType.ARCHIVE;
    return FileType.OTHER;
  }

  /**
   * Validate filename
   */
  private isValidFileName(fileName: string): boolean {
    // Allow alphanumeric, spaces, dots, hyphens, underscores
    const validNameRegex = /^[a-zA-Z0-9\s\.\-_]+$/;
    
    if (!validNameRegex.test(fileName)) return false;
    if (fileName.length > 255) return false;

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = path.basename(fileName, path.extname(fileName)).toUpperCase();
    
    return !reservedNames.includes(nameWithoutExt);
  }

  /**
   * Check for suspicious files
   */
  private isSuspiciousFile(fileName: string): boolean {
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar'];
    const lowerFileName = fileName.toLowerCase();
    
    // Check for executable extensions
    for (const ext of suspiciousExtensions) {
      if (lowerFileName.includes(ext)) return true;
    }

    // Check for double extensions
    const parts = lowerFileName.split('.');
    if (parts.length > 2) {
      const lastTwo = parts.slice(-2);
      if (suspiciousExtensions.some(ext => lastTwo.join('.').includes(ext.substring(1)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Virus scanning (placeholder - integrate with actual antivirus service)
   */
  private async scanForViruses(filePath: string): Promise<{ clean: boolean; threat?: string }> {
    // TODO: Integrate with actual virus scanning service (ClamAV, VirusTotal, etc.)
    // For now, return clean
    return { clean: true };
  }

  /**
   * Get validation configuration
   */
  getConfig(): FileValidationConfig {
    return { ...this.config };
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(filePath: string, algorithm: string = 'md5'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
