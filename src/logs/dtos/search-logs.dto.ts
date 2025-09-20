import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { LogLevel } from "../enums/log-level.enum";
import { LogType } from "../enums/log-type.enum";
import { Type } from "class-transformer";

export class SearchLogsDto {
    @ApiPropertyOptional({ description: 'Date de début', example: '2024-01-01T00:00:00.000Z' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Date de fin', example: '2024-12-31T23:59:59.999Z' })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Niveau du log', enum: LogLevel, example: LogLevel.ERROR })
    @IsOptional()
    @IsEnum(LogLevel)
    level?: LogLevel;

    @ApiPropertyOptional({ description: 'Type du log', enum: LogType, example: LogType.TRANSACTION })
    @IsOptional()
    @IsEnum(LogType)
    type?: LogType;

    @ApiPropertyOptional({ description: 'ID de l\'utilisateur', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'ID de l\'application', example: '66bf8a89203d5fab750c0f63' })
    @IsOptional()
    @IsString()
    applicationId?: string;

    @ApiPropertyOptional({ description: 'Action effectuée', example: 'LOGIN' })
    @IsOptional()
    @IsString()
    action?: string;

    @ApiPropertyOptional({ description: 'Nombre maximum de résultats', example: 100, default: 100 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({ description: 'Nombre de résultats à sauter', example: 0, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    skip?: number;
}