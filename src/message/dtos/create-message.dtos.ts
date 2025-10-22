import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsString, MinLength, IsOptional, IsArray, IsBoolean } from "class-validator";

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
    ticket: string;

    @ApiProperty({
        description: "The id of the message being replied to",
        example: '66f2ab15f9936d99f9985152',
        required: false
    })
    @IsOptional()
    @IsMongoId()
    replyTo?: string;

    @ApiProperty({
        description: "Whether this is a reply message",
        example: false,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    isReply?: boolean;

    @ApiProperty({
        description: "Array of user IDs mentioned in the message",
        example: ['8c50507e-f2d5-4250-8dd7-502ce4273df6'],
        required: false
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mentionedUsers?: string[];

    @ApiProperty({
        description: "Array of tags for the message",
        example: ['urgent', 'bug'],
        required: false
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiProperty({
        description: "Whether this is a system message",
        example: false,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    isSystem?: boolean;

    @ApiProperty({
        description: "Array of attachment URLs",
        example: ['https://example.com/file.pdf'],
        required: false
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments?: string[];
}