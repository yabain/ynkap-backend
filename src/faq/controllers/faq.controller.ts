import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus,UseGuards,Logger} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery,ApiBearerAuth } from '@nestjs/swagger';
import { FAQService, PaginatedFAQResult, FAQSuggestion } from '../services/faq.service';
import { CreateFAQDTO } from '../dtos/create-faq.dto';
import { UpdateFAQDTO } from '../dtos/update-faq.dto';
import { SearchFAQDTO, SuggestFAQDTO } from '../dtos/search-faq.dto';
import { FAQ } from '../models/faq.schema';

@ApiTags('FAQ Management')
@Controller('faq')
export class FAQController {
    private readonly logger = new Logger(FAQController.name);

    constructor(private readonly faqService: FAQService) {}

    @Post()
    @ApiOperation({ 
        summary: 'Create a new FAQ',
        description: 'Create a new frequently asked question with answer and tags'
    })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'FAQ created successfully',
        type: FAQ
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Invalid input data' 
    })
    async create(@Body() createFAQDto: CreateFAQDTO): Promise<FAQ> {
        this.logger.log(`Creating new FAQ: ${createFAQDto.question}`);
        return await this.faqService.create(createFAQDto);
    }

    @Get()
    @ApiOperation({ 
        summary: 'Search and list FAQs',
        description: 'Get all FAQs with optional filtering, searching, and pagination'
    })
    @ApiQuery({ name: 'query', required: false, description: 'Search query for questions and answers' })
    @ApiQuery({ name: 'tags', required: false, description: 'Filter by tags (comma-separated)', type: String })
    @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status', type: Boolean })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number, example: 10 })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQs retrieved successfully'
    })
    async findAll(
        @Query('query') query?: string,
        @Query('tags') tags?: string,
        @Query('isActive') isActive?: boolean,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ): Promise<PaginatedFAQResult> {
        const searchDto: SearchFAQDTO = {
            query,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
            isActive,
            page,
            limit
        };

        this.logger.log(`Searching FAQs with criteria: ${JSON.stringify(searchDto)}`);
        return await this.faqService.findAll(searchDto);
    }

    @Get('popular')
    @ApiOperation({ 
        summary: 'Get popular FAQs',
        description: 'Retrieve the most viewed FAQs'
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of FAQs to return', type: Number, example: 10 })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Popular FAQs retrieved successfully',
        type: [FAQ]
    })
    async findPopular(@Query('limit') limit?: number): Promise<FAQ[]> {
        this.logger.log(`Getting popular FAQs with limit: ${limit || 10}`);
        return await this.faqService.findPopular(limit);
    }

    @Get('statistics')
    @ApiOperation({ 
        summary: 'Get FAQ statistics',
        description: 'Retrieve comprehensive statistics about FAQs'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQ statistics retrieved successfully'
    })
    async getStatistics(): Promise<{
        totalFAQs: number;
        activeFAQs: number;
        inactiveFAQs: number;
        totalViews: number;
        averageViews: number;
        topTags: { tag: string; count: number }[];
    }> {
        this.logger.log('Getting FAQ statistics');
        return await this.faqService.getStatistics();
    }

    @Post('suggest')
    @ApiOperation({ 
        summary: 'Get intelligent FAQ suggestions',
        description: 'Get relevant FAQ suggestions based on keywords, title, or description'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQ suggestions retrieved successfully'
    })
    async suggestFAQs(@Body() suggestDto: SuggestFAQDTO): Promise<FAQSuggestion[]> {
        this.logger.log(`Getting FAQ suggestions for: ${JSON.stringify(suggestDto)}`);
        return await this.faqService.suggestFAQs(suggestDto);
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Get FAQ by ID',
        description: 'Retrieve a specific FAQ by its ID. This will increment the view count.'
    })
    @ApiParam({ name: 'id', description: 'FAQ ID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQ retrieved successfully',
        type: FAQ
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'FAQ not found' 
    })
    async findById(@Param('id') id: string): Promise<FAQ> {
        this.logger.log(`Getting FAQ by ID: ${id}`);
        return await this.faqService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ 
        summary: 'Update FAQ',
        description: 'Update an existing FAQ by ID'
    })
    @ApiParam({ name: 'id', description: 'FAQ ID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQ updated successfully',
        type: FAQ
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'FAQ not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Invalid input data' 
    })
    async update(
        @Param('id') id: string, 
        @Body() updateFAQDto: UpdateFAQDTO
    ): Promise<FAQ> {
        this.logger.log(`Updating FAQ with ID: ${id}`);
        return await this.faqService.update(id, updateFAQDto);
    }

    @Delete(':id')
    @ApiOperation({ 
        summary: 'Delete FAQ',
        description: 'Delete an FAQ by ID'
    })
    @ApiParam({ name: 'id', description: 'FAQ ID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQ deleted successfully' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'FAQ not found' 
    })
    async delete(@Param('id') id: string): Promise<{ message: string }> {
        this.logger.log(`Deleting FAQ with ID: ${id}`);
        await this.faqService.delete(id);
        return { message: 'FAQ deleted successfully' };
    }

    // Convenience endpoints for specific use cases

    @Get('search/advanced')
    @ApiOperation({ 
        summary: 'Advanced FAQ search',
        description: 'Advanced search with multiple criteria and text matching'
    })
    @ApiQuery({ name: 'q', required: false, description: 'Search query' })
    @ApiQuery({ name: 'tags', required: false, description: 'Filter by tags (comma-separated)' })
    @ApiQuery({ name: 'active', required: false, description: 'Filter by active status', type: Boolean })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
    @ApiQuery({ name: 'size', required: false, description: 'Page size', type: Number })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Advanced search results retrieved successfully'
    })
    async advancedSearch(
        @Query('q') query?: string,
        @Query('tags') tags?: string,
        @Query('active') isActive?: boolean,
        @Query('page') page?: number,
        @Query('size') limit?: number
    ): Promise<PaginatedFAQResult> {
        const searchDto: SearchFAQDTO = {
            query,
            tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : undefined,
            isActive,
            page: page || 1,
            limit: limit || 10
        };

        this.logger.log(`Advanced search with criteria: ${JSON.stringify(searchDto)}`);
        return await this.faqService.findAll(searchDto);
    }

    @Get('tags/popular')
    @ApiOperation({ 
        summary: 'Get popular tags',
        description: 'Get the most frequently used tags in FAQs'
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of tags to return', type: Number, example: 20 })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Popular tags retrieved successfully'
    })
    async getPopularTags(@Query('limit') limit?: number): Promise<{ tag: string; count: number }[]> {
        this.logger.log(`Getting popular tags with limit: ${limit || 20}`);
        const stats = await this.faqService.getStatistics();
        return stats.topTags.slice(0, limit || 20);
    }

    @Post('batch/activate')
    @ApiOperation({ 
        summary: 'Batch activate FAQs',
        description: 'Activate multiple FAQs at once'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQs activated successfully'
    })
    async batchActivate(@Body('ids') ids: string[]): Promise<{ message: string; updated: number }> {
        this.logger.log(`Batch activating FAQs: ${ids.join(', ')}`);
        let updated = 0;
        
        for (const id of ids) {
            try {
                await this.faqService.update(id, { isActive: true });
                updated++;
            } catch (error) {
                this.logger.warn(`Failed to activate FAQ ${id}: ${error.message}`);
            }
        }

        return { 
            message: `${updated} FAQs activated successfully`,
            updated
        };
    }

    @Post('batch/deactivate')
    @ApiOperation({ 
        summary: 'Batch deactivate FAQs',
        description: 'Deactivate multiple FAQs at once'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'FAQs deactivated successfully'
    })
    async batchDeactivate(@Body('ids') ids: string[]): Promise<{ message: string; updated: number }> {
        this.logger.log(`Batch deactivating FAQs: ${ids.join(', ')}`);
        let updated = 0;
        
        for (const id of ids) {
            try {
                await this.faqService.update(id, { isActive: false });
                updated++;
            } catch (error) {
                this.logger.warn(`Failed to deactivate FAQ ${id}: ${error.message}`);
            }
        }

        return { 
            message: `${updated} FAQs deactivated successfully`,
            updated
        };
    }
}