import { Transform } from "class-transformer";
import { IsString, MinLength, IsOptional, IsArray } from "class-validator";
import { TicketTypes } from "../enums/ticket-types.enum";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTicketDTO {

    @ApiProperty({
        description: "Ticket title",
        example: "Bug lors de la création d'un ticket",
        required:true,
        minLength: 8
    })
    @IsString()
    @MinLength(8)
    title: string;

    @ApiProperty({
        description: "Detailed description of the problem",
        example: "Je rencontre un bugs à la création d'un nouveau ticket",
        required:true,
        minLength: 12
    })
    @IsString()
    @MinLength(12)
    description: string;

    @ApiProperty({
        description: "Type of ticket to be created",
        required:true,
        enum: ['bug', 'transaction', 'others']
    })
    @Transform(({value}) => value.toUpperCase())
    @IsString()
    type: TicketTypes;

    @ApiProperty({
        description: "Array of attachment IDs to attach to the ticket",
        required: false,
        type: [String]
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments?: string[];
}