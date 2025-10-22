import { Transform } from "class-transformer";
import { IsString, IsOptional, MaxLength } from "class-validator";
import { TicketStatus } from "../enums/ticket-status.enum";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateStatusTicketDTO {

    @ApiProperty({
        description: "New status for the ticket",
        enum: ['OPEN', 'IN_PROGRESS', 'SOLVE', 'CLOSE'],
        example: 'IN_PROGRESS'
    })
    @Transform(({value}) => value.toUpperCase())
    @IsString()
    newStatus: TicketStatus;

    @ApiPropertyOptional({
        description: "Reason for status change",
        example: "Starting work on this issue"
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;

    @ApiPropertyOptional({
        description: "Resolution notes (required when marking as SOLVE)",
        example: "Issue resolved by updating the configuration"
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    resolutionNotes?: string;

    @ApiPropertyOptional({
        description: "Rejection reason (required when closing without solving)",
        example: "Duplicate ticket - closing in favor of #TKT-123"
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    rejectionReason?: string;
}