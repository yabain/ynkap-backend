import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, UseGuards, Logger, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { Request } from 'express';
import { FAQService } from '../services/faq.service';
import { PaginatedFAQResult, FAQSuggestion, BatchOperationResponse } from '../interfaces/faq.interfaces';
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
        description: 'Create a new frequently asked question with answer and tags. Requires solver, manager, or admin role.'
    })
    @ApiBearerAuth()
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'FAQ created successfully',
        type: FAQ
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication required'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'solver, manager, or admin role required'
    })
    async create(
        @Body() createFAQDto: CreateFAQDTO,
        @AuthenticatedUser() user: any,
        @Req() req: Request
    ): Promise<FAQ> {
        // Check role access manually like ticket service does
        const roles = req['user']['realm_access']['roles'];
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );
        if (!isSolver) {
            throw new ForbiddenException('solver, manager, or admin role required');
        }

        this.logger.log(`Creating new FAQ: ${createFAQDto.question} by user: ${user?.preferred_username || 'unknown'}`);
        this.logger.log(`FAQ Data received:`, JSON.stringify(createFAQDto, null, 2));
        this.logger.log(`User roles:`, JSON.stringify(roles, null, 2));
        
        const userId = req['user']['sub'];
        return await this.faqService.create(createFAQDto, userId);
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
        @Query('limit') limit?: number,
        @AuthenticatedUser() user?: any,
        @Req() req?: Request
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
    @Public()
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
    async findPopular(
        @Query('limit') limit?: number
    ): Promise<FAQ[]> {
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
    async getStatistics(
        @AuthenticatedUser() user?: any,
        @Req() req?: Request
    ): Promise<{
        totalFAQs: number;
        activeFAQs: number;
        inactiveFAQs: number;
        totalViews: number;
        averageViews: number;
        topTags: { tag: string; count: number }[];
    }> {
        this.logger.log(`Getting FAQ statistics for user: ${user?.preferred_username || 'unknown'}`);
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
    async suggestFAQs(
        @Body() suggestDto: SuggestFAQDTO,
        @AuthenticatedUser() user?: any,
        @Req() req?: Request
    ): Promise<FAQSuggestion[]> {
        this.logger.log(`Getting FAQ suggestions for: ${JSON.stringify(suggestDto)} by user: ${user?.preferred_username || 'unknown'}`);
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
    async findById(
        @Param('id') id: string,
        @AuthenticatedUser() user?: any,
        @Req() req?: Request
    ): Promise<FAQ> {
        const userId = req && req['user'] ? req['user']['sub'] : undefined;
        this.logger.log(`=== DEBUG FAQ VIEW ===`);
        this.logger.log(`FAQ ID: ${id}`);
        this.logger.log(`User ID extracted: ${userId}`);
        this.logger.log(`User object:`, JSON.stringify(user, null, 2));
        this.logger.log(`Request user:`, JSON.stringify(req?.['user'], null, 2));
        this.logger.log(`==================`);
        
        return await this.faqService.findById(id, userId);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update FAQ',
        description: 'Update an existing FAQ by ID. Requires solver, manager, or admin role.'
    })
    @ApiBearerAuth()
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
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication required'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'solver, manager, or admin role required'
    })
    async update(
        @Param('id') id: string,
        @Body() updateFAQDto: UpdateFAQDTO,
        @AuthenticatedUser() user: any,
        @Req() req: Request
    ): Promise<FAQ> {
        // Check role access manually
        const roles = req['user']['realm_access']['roles'];
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );
        if (!isSolver) {
            throw new ForbiddenException('solver, manager, or admin role required');
        }

        this.logger.log(`Updating FAQ with ID: ${id} by user: ${user?.preferred_username || 'unknown'}`);
        return await this.faqService.update(id, updateFAQDto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete FAQ',
        description: 'Delete an FAQ by ID. Requires solver, manager, or admin role.'
    })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: 'FAQ ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ deleted successfully'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'FAQ not found'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication required'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'solver, manager, or admin role required'
    })
    async delete(
        @Param('id') id: string,
        @AuthenticatedUser() user: any,
        @Req() req: Request
    ): Promise<{ message: string }> {
        // Check role access manually
        const roles = req['user']['realm_access']['roles'];
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );
        if (!isSolver) {
            throw new ForbiddenException('solver, manager, or admin role required');
        }

        this.logger.log(`Deleting FAQ with ID: ${id} by user: ${user?.preferred_username || 'unknown'}`);
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
        @Query('size') limit?: number,
        @AuthenticatedUser() user?: any,
        @Req() req?: Request
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
    async getPopularTags(
        @Query('limit') limit?: number,
        @AuthenticatedUser() user?: any,
        @Req() req?: Request
    ): Promise<{ tag: string; count: number }[]> {
        this.logger.log(`Getting popular tags with limit: ${limit || 20} for user: ${user?.preferred_username || 'unknown'}`);
        const stats = await this.faqService.getStatistics();
        return stats.topTags.slice(0, limit || 20);
    }

    @Post('batch/activate')
    @ApiOperation({
        summary: 'Batch activate FAQs',
        description: 'Activate multiple FAQs at once. Requires solver, manager, or admin role.'
    })
    @ApiBearerAuth()
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQs activated successfully'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication required'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'solver, manager, or admin role required'
    })
    async batchActivate(
        @Body('ids') ids: string[],
        @AuthenticatedUser() user: any,
        @Req() req: Request
    ): Promise<BatchOperationResponse> {
        // Check role access manually
        const roles = req['user']['realm_access']['roles'];
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );
        if (!isSolver) {
            throw new ForbiddenException('solver, manager, or admin role required');
        }

        this.logger.log(`Batch activating FAQs: ${ids.join(', ')} by user: ${user?.preferred_username || 'unknown'}`);
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
        description: 'Deactivate multiple FAQs at once. Requires solver, manager, or admin role.'
    })
    @ApiBearerAuth()
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQs deactivated successfully'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication required'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'solver, manager, or admin role required'
    })
    async batchDeactivate(
        @Body('ids') ids: string[],
        @AuthenticatedUser() user: any,
        @Req() req: Request
    ): Promise<BatchOperationResponse> {
        // Check role access manually
        const roles = req['user']['realm_access']['roles'];
        const isSolver = roles.some(role =>
            role.includes('solver') ||
            role.includes('manager') ||
            role.includes('admin')
        );
        if (!isSolver) {
            throw new ForbiddenException('solver, manager, or admin role required');
        }

        this.logger.log(`Batch deactivating FAQs: ${ids.join(', ')} by user: ${user?.preferred_username || 'unknown'}`);
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

    @Post('seed')
    @Public()
    @ApiOperation({
        summary: 'Seed sample FAQs',
        description: 'Create sample FAQs for testing (development only)'
    })
    async seedFAQs(): Promise<{ message: string; created: number }> {
        const sampleFAQs = [
            {
                question: 'Comment créer un compte Y-Nkap ?',
                answer: 'Pour créer un compte Y-Nkap, rendez-vous sur notre page d\'inscription, remplissez le formulaire avec vos informations personnelles et suivez les instructions de vérification par email.',
                tags: ['compte', 'inscription', 'création'],
                isActive: true,
                viewCount: 150
            },
            {
                question: 'Quels sont les frais de transaction ?',
                answer: 'Les frais de transaction varient selon le type d\'opération. Pour les paiements mobiles, les frais sont de 1% du montant. Pour les virements bancaires, les frais sont fixes à 500 FCFA.',
                tags: ['frais', 'transaction', 'paiement'],
                isActive: true,
                viewCount: 200
            },
            {
                question: 'Comment intégrer l\'API Y-Nkap ?',
                answer: 'L\'intégration de l\'API Y-Nkap se fait en 3 étapes : 1) Créer votre compte développeur, 2) Obtenir vos clés API, 3) Suivre notre documentation technique disponible dans l\'espace développeur.',
                tags: ['api', 'intégration', 'développeur'],
                isActive: true,
                viewCount: 180
            },
            {
                question: 'Que faire en cas de transaction échouée ?',
                answer: 'En cas de transaction échouée, vérifiez d\'abord votre solde et la validité de vos informations. Si le problème persiste, contactez notre support avec le numéro de transaction.',
                tags: ['transaction', 'échec', 'support'],
                isActive: true,
                viewCount: 120
            },
            {
                question: 'Comment sécuriser mon compte ?',
                answer: 'Pour sécuriser votre compte : utilisez un mot de passe fort, activez l\'authentification à deux facteurs, ne partagez jamais vos identifiants et surveillez régulièrement vos transactions.',
                tags: ['sécurité', 'compte', 'protection'],
                isActive: true,
                viewCount: 95
            }
        ];

        let created = 0;
        for (const faqData of sampleFAQs) {
            try {
                await this.faqService.create(faqData, 'system');
                created++;
            } catch (error) {
                this.logger.warn(`Failed to create sample FAQ: ${error.message}`);
            }
        }

        return {
            message: `${created} sample FAQs created successfully`,
            created
        };
    }
}