import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

export class CreateLogDto {
  @ApiProperty({ 
    enum: LogLevel, 
    description: 'Niveau du log',
    example: LogLevel.INFO
  })
  @IsEnum(LogLevel)
  level: LogLevel;

  @ApiProperty({ 
    enum: LogType, 
    description: 'Type du log',
    example: LogType.ACTIVITY
  })
  @IsEnum(LogType)
  type: LogType;

  @ApiProperty({ 
    description: 'Message du log',
    example: 'Opération réussie'
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({ 
    description: 'ID de l\'utilisateur associé au log',
    example: '60d21b4667d0d8992e610c85'
  })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional({ 
    description: 'Métadonnées additionnelles', 
    type: 'object',
    example: {
      ip: '192.168.1.1',
      browser: 'Chrome',
      endpoint: '/api/users'
    }
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}


