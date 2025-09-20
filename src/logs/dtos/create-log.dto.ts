import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

export class CreateLogDto {
  @ApiProperty({
    enum: LogLevel,
    example: LogLevel.INFO,
    description: 'Niveau de gravité du log'
  })
  @IsEnum(LogLevel)
  level: LogLevel;

  @ApiProperty({
    enum: LogType,
    example: LogType.ACTIVITY,
    description: 'Type de log'
  })
  @IsEnum(LogType)
  type: LogType;

  @ApiProperty({
    example: 'Paiement effectué avec succès',
    description: 'Message du log'
  })
  @IsString()
  message: string;

  @ApiProperty({
    example: 'user123',
    description: 'Identifiant de l\'utilisateur concerné',
    required: false
  })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiProperty({
    example: {
      transactionId: 'tx123',
      amount: 1000,
      currency: 'XAF',
      status: 'SUCCESS'
    },
    description: 'Métadonnées additionnelles',
    required: false
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}




