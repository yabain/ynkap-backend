import { IsString, IsOptional, IsEnum, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum StatsExportFormat {
    PDF = 'pdf',
    EXCEL = 'excel',
    CSV = 'csv'
}

export class StatsExportOptionsDTO {
    @IsString()
    @ApiProperty({ example: "66bf8a89203d5fab750c0f63", description: "ID of the application" })
    appID: string;

    @IsEnum(StatsExportFormat)
    @ApiProperty({ 
        enum: StatsExportFormat, 
        example: StatsExportFormat.PDF, 
        description: "Format of the export file" 
    })
    format: StatsExportFormat;

    @IsString()
    @IsOptional()
    @ApiProperty({ 
        example: "2024-01-01T00:00:00.000Z", 
        description: "Start date for statistics (ISO format)", 
        required: false 
    })
    startDate?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({ 
        example: "2024-12-31T23:59:59.999Z", 
        description: "End date for statistics (ISO format)", 
        required: false 
    })
    endDate?: string;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({ 
        example: true, 
        description: "Whether to include charts in the PDF", 
        required: false,
        default: true
    })
    includeCharts?: boolean;

    @IsString()
    @IsOptional()
    @ApiProperty({ 
        example: "financial_stats", 
        description: "Name of the export file (without extension)", 
        required: false 
    })
    fileName?: string;
}