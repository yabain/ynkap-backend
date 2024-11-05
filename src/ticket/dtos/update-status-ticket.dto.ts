import { Transform } from "class-transformer";
import { IsString } from "class-validator";
import { TicketStatus } from "../enums/ticket-status.enum";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateStatusTicketDTO {

    @ApiProperty({
        description: "Nouvel état du statut pour un ticket",
        enum: ['OPEN', 'IN_PROGRESS', 'SOLVE', 'CLOSE'],
        example: 'OPEN'
    })
    @Transform(({value}) => value.toUpperCase())
    @IsString()
    newStatus: TicketStatus;
}