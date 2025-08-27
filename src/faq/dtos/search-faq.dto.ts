import { IsString, IsArray, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFAQDTO {

    @ApiPropertyOptional({
        description: 'Search query for questions and answers',
        example: 'password reset'
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    query?: string;

    @ApiPropertyOptional({
        description: 'Filter by specific tags',
        example: ['password', 'login'],
        type: [String]
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (Array.isArray(value)) {
            return value
                .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : '')
                .filter(tag => tag.length > 0);
        }
        return [];
    })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'Filter by active status',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Page number for pagination',
        example: 1,
        default: 1,
        minimum: 1
    })
    @IsOptional()
    @IsNumber({}, { message: 'Page must be a number' })
    @Min(1, { message: 'Page must be at least 1' })
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 10,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    @IsOptional()
    @IsNumber({}, { message: 'Limit must be a number' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Max(100, { message: 'Limit cannot exceed 100' })
    @Type(() => Number)
    limit?: number = 10;

}

export class SuggestFAQDTO {

    @ApiPropertyOptional({
        description: 'Keywords to match against FAQ content',
        example: ['password', 'login', 'reset']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (Array.isArray(value)) {
            return value
                .map(keyword => typeof keyword === 'string' ? keyword.trim().toLowerCase() : '')
                .filter(keyword => keyword.length > 0);
        }
        return [];
    })
    keywords?: string[];

    @ApiPropertyOptional({
        description: 'Ticket title for context matching',
        example: 'Cannot login to my account'
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    title?: string;

    @ApiPropertyOptional({
        description: 'Ticket description for context matching',
        example: 'I forgot my password and cannot access my account'
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    description?: string;

    @ApiPropertyOptional({
        description: 'Maximum number of suggestions to return',
        example: 5,
        default: 5,
        minimum: 1,
        maximum: 20
    })
    @IsOptional()
    @IsNumber({}, { message: 'Max suggestions must be a number' })
    @Min(1, { message: 'Max suggestions must be at least 1' })
    @Max(20, { message: 'Max suggestions cannot exceed 20' })
    @Type(() => Number)
    maxSuggestions?: number = 5;

}