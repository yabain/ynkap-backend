import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { SearchLogsDto } from "./search-logs.dto";

export enum ExportFormat {
    CSV = 'csv',
    EXCEL = 'excel',
    PDF = 'pdf'
}

export class LogExportOptionsDto extends SearchLogsDto {
    @ApiProperty({
        enum: ExportFormat,
        description: 'Format d\'exportation',
        example: ExportFormat.PDF
    })
    @IsEnum(ExportFormat)
    format: ExportFormat;

    @ApiPropertyOptional({
        description: 'Nom du fichier (sans extension)',
        example: 'logs_export'
    })
    @IsOptional()
    @IsString()
    fileName?: string;
}