import { IsString, IsArray, IsOptional, IsBoolean, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFAQDTO {

    @ApiPropertyOptional({
        description: 'The FAQ question',
        example: 'How do I reset my password?',
        minLength: 5,
        maxLength: 500
    })
    @IsOptional()
    @IsString()
    @MinLength(5, { message: 'Question must be at least 5 characters long' })
    @MaxLength(500, { message: 'Question cannot exceed 500 characters' })
    @Transform(({ value }) => value?.trim())
    question?: string;

    @ApiPropertyOptional({
        description: 'The FAQ answer',
        example: 'To reset your password, go to the login page and click "Forgot Password"...',
        minLength: 10,
        maxLength: 5000
    })
    @IsOptional()
    @IsString()
    @MinLength(10, { message: 'Answer must be at least 10 characters long' })
    @MaxLength(5000, { message: 'Answer cannot exceed 5000 characters' })
    @Transform(({ value }) => value?.trim())
    answer?: string;

    @ApiPropertyOptional({
        description: 'Tags for categorization and search',
        example: ['password', 'login', 'security'],
        type: [String],
        maxItems: 10
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10, { message: 'Cannot have more than 10 tags' })
    @Transform(({ value }) => {
        if (Array.isArray(value)) {
            return value
                .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : '')
                .filter(tag => tag.length > 0);
        }
        return value;
    })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'Whether the FAQ is active/visible',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

}