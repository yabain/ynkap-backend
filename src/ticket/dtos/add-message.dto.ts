import { IsNotEmpty, IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

export class AddMessageDTO {
    @IsNotEmpty()
    @IsString()
    content: string;

    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    attachments?: string[];

    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    relatedFaqs?: string[];
}
