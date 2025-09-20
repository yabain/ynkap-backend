import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateActionLogDto {
  @ApiProperty({
    description: 'Action effectuée',
    example: 'WABA MEjest'
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Détails de l\'action',
    example: 'Connexion réussie depuis l\'adresse IP 192.168.1.1'
  })
  @IsString()
  details: string;

  @ApiPropertyOptional({
    description: 'Utilisateur qui a effectué l\'action',
    example: 'ulrich'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Métadonnées supplémentaires',
    example: { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}