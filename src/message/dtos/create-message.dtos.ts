import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsString, MinLength } from "class-validator";

export class CreateMessageDTO {

    @ApiProperty({
        description: "The message which is sent",
        example: 'Bonjour monsieur l\agent',
        minLength: 1
    })
    @IsString()
    @MinLength(1)
    content: string;

    @ApiProperty({
        description: "The id of user sending the message",
        example: '8c50507e-f2d5-4250-8dd7-502ce4273df6'
    })
    @IsString()
    sender: string;

    @ApiProperty({
        description: "The id of the ticket within which exchanges take place",
        example: '66f2ab15f9936d99f9985151'
    })
    @IsMongoId()
    ticket: string
}