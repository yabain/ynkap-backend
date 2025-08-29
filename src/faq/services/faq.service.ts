import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FAQ, FAQDocument } from '../models/faq.schema';
import { CreateFAQDTO } from '../dtos/create-faq.dto';
import { UpdateFAQDTO } from '../dtos/update-faq.dto';
import { SearchFAQDTO, SuggestFAQDTO } from '../dtos/search-faq.dto';
import { PaginatedFAQResult, FAQSuggestion, FAQStatistics } from '../interfaces/faq.interfaces';

@Injectable()
export class FAQService {
    private readonly logger = new Logger(FAQService.name);

    constructor(
        @InjectModel(FAQ.name) private faqModel: Model<FAQDocument>
    ) {}

    /**
     * Create a new FAQ
     */
    async create(createFAQDto: CreateFAQDTO, createdBy: string): Promise<FAQ> {
        try {
            const faq = new this.faqModel({
                ...createFAQDto,
                createdBy
            });
            const savedFAQ = await faq.save();
            
            this.logger.log(`FAQ created with ID: ${savedFAQ._id} by user: ${createdBy}`);
            return savedFAQ;
        } catch (error) {
            this.logger.error(`Failed to create FAQ: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to create FAQ');
        }
    }

    /**
     * Find all FAQs with pagination and filtering
     */
    async findAll(searchDto: SearchFAQDTO): Promise<PaginatedFAQResult> {
        const { query, tags, isActive, page = 1, limit = 10 } = searchDto;
        
        try {
            // Build search criteria
            const searchCriteria: any = {};

            // Filter by active status
            if (isActive !== undefined) {
                searchCriteria.isActive = isActive;
            }

            // Filter by tags
            if (tags && tags.length > 0) {
                searchCriteria.tags = { $in: tags };
            }

            // Text search query
            if (query && query.trim()) {
                searchCriteria.$text = { $search: query };
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Execute queries
            const [items, total] = await Promise.all([
                this.faqModel
                    .find(searchCriteria)
                    .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.faqModel.countDocuments(searchCriteria).exec()
            ]);

            const totalPages = Math.ceil(total / limit);

            return {
                items,
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            };

        } catch (error) {
            this.logger.error(`Failed to search FAQs: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to search FAQs');
        }
    }

    /**
     * Find FAQ by ID with optional view count increment for unique users
     */
    async findById(id: string, userId?: string): Promise<FAQ> {
        try {
            const faq = await this.faqModel.findById(id).exec();
            
            if (!faq) {
                throw new NotFoundException(`FAQ with ID ${id} not found`);
            }

            this.logger.log(`=== FAQ SERVICE DEBUG ===`);
            this.logger.log(`FAQ ID: ${id}`);
            this.logger.log(`User ID: ${userId}`);
            this.logger.log(`Current view count: ${faq.viewCount}`);
            this.logger.log(`ViewedBy array: ${JSON.stringify(faq.viewedBy || [])}`);
            this.logger.log(`ViewedBy array type: ${typeof faq.viewedBy}`);
            this.logger.log(`ViewedBy is array: ${Array.isArray(faq.viewedBy)}`);

            // Initialize viewedBy if it doesn't exist (for existing FAQs)
            if (!faq.viewedBy) {
                this.logger.log(`ViewedBy field missing, initializing...`);
                faq.viewedBy = [];
            }

            const hasUserViewed = faq.viewedBy.includes(userId);
            this.logger.log(`User ${userId} has viewed before: ${hasUserViewed}`);

            // Increment view count only if user hasn't viewed this FAQ before
            if (userId && !hasUserViewed) {
                this.logger.log(`Incrementing view count for new user...`);
                
                const updateResult = await this.faqModel.findByIdAndUpdate(
                    id,
                    {
                        $inc: { viewCount: 1 },
                        $addToSet: { viewedBy: userId }
                    },
                    { new: true } // Return updated document
                ).exec();
                
                this.logger.log(`Update result:`, JSON.stringify(updateResult, null, 2));
                
                // Update the returned faq object with incremented count
                faq.viewCount = updateResult.viewCount;
                faq.viewedBy = updateResult.viewedBy;
                
                this.logger.log(`FAQ ${id} NEW VIEW by user ${userId} (view count: ${faq.viewCount})`);
            } else if (userId) {
                this.logger.log(`FAQ ${id} ALREADY VIEWED by user ${userId}, count stays ${faq.viewCount}`);
            } else {
                this.logger.log(`No user ID provided, no view tracking`);
            }
            
            this.logger.log(`=== END FAQ SERVICE DEBUG ===`);
            
            return faq;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to find FAQ by ID ${id}: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to retrieve FAQ');
        }
    }

    /**
     * Update FAQ by ID
     */
    async update(id: string, updateFAQDto: UpdateFAQDTO): Promise<FAQ> {
        try {
            const updatedFAQ = await this.faqModel
                .findByIdAndUpdate(
                    id, 
                    { 
                        ...updateFAQDto,
                        updatedAt: new Date()
                    }, 
                    { new: true, runValidators: true }
                )
                .exec();

            if (!updatedFAQ) {
                throw new NotFoundException(`FAQ with ID ${id} not found`);
            }

            this.logger.log(`FAQ updated with ID: ${id}`);
            return updatedFAQ;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update FAQ ${id}: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to update FAQ');
        }
    }

    /**
     * Delete FAQ by ID
     */
    async delete(id: string): Promise<void> {
        try {
            const result = await this.faqModel.findByIdAndDelete(id).exec();
            
            if (!result) {
                throw new NotFoundException(`FAQ with ID ${id} not found`);
            }

            this.logger.log(`FAQ deleted with ID: ${id}`);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete FAQ ${id}: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to delete FAQ');
        }
    }

    /**
     * Get popular FAQs based on view count
     */
    async findPopular(limit: number = 10): Promise<FAQ[]> {
        try {
            return await this.faqModel
                .find({ isActive: true })
                .sort({ viewCount: -1 })
                .limit(limit)
                .exec();
        } catch (error) {
            this.logger.error(`Failed to get popular FAQs: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to retrieve popular FAQs');
        }
    }

    /**
     * Intelligent FAQ suggestions based on keywords and context
     */
    async suggestFAQs(suggestDto: SuggestFAQDTO): Promise<FAQSuggestion[]> {
        const { keywords = [], title, description, maxSuggestions = 5 } = suggestDto;
        
        try {
            // Combine all text for analysis
            const allText = [title, description, ...keywords]
                .filter(text => text && text.trim())
                .join(' ')
                .toLowerCase();

            if (!allText.trim()) {
                return [];
            }

            // Extract meaningful words (remove common words)
            const meaningfulWords = this.extractMeaningfulWords(allText);
            
            if (meaningfulWords.length === 0) {
                return [];
            }

            // Find FAQs that match keywords or contain similar content
            const suggestions: FAQSuggestion[] = [];
            
            // Get active FAQs
            const activeFAQs = await this.faqModel
                .find({ isActive: true })
                .exec();

            for (const faq of activeFAQs) {
                const relevanceScore = this.calculateRelevanceScore(faq, meaningfulWords);
                
                if (relevanceScore > 0) {
                    const matchedFields = this.getMatchedFields(faq, meaningfulWords);
                    
                    suggestions.push({
                        faq,
                        relevanceScore,
                        matchedFields
                    });
                }
            }

            // Sort by relevance score and limit results
            return suggestions
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, maxSuggestions);

        } catch (error) {
            this.logger.error(`Failed to suggest FAQs: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to get FAQ suggestions');
        }
    }

    /**
     * Extract meaningful words by removing common stop words
     */
    private extractMeaningfulWords(text: string): string[] {
        const stopWords = new Set([
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
            'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
            'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
            'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
            'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
            'while', 'of', 'at', 'by', 'for', 'with', 'through', 'during', 'before', 'after',
            'above', 'below', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
            'further', 'then', 'once', 'to', 'can', 'cannot', 'could', 'how', 'when', 'where'
        ]);

        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    }

    /**
     * Calculate relevance score based on keyword matches
     */
    private calculateRelevanceScore(faq: FAQ, keywords: string[]): number {
        let score = 0;
        const faqText = `${faq.question} ${faq.answer} ${faq.tags.join(' ')}`.toLowerCase();

        for (const keyword of keywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            const matches = faqText.match(regex) || [];
            
            // Weight scores differently based on where the match occurs
            const questionMatches = faq.question.toLowerCase().match(regex) || [];
            const tagMatches = faq.tags.join(' ').toLowerCase().match(regex) || [];
            const answerMatches = faq.answer.toLowerCase().match(regex) || [];

            // Question matches are worth more
            score += questionMatches.length * 3;
            // Tag matches are worth more than answer matches
            score += tagMatches.length * 2;
            // Answer matches are worth less but still contribute
            score += answerMatches.length * 1;
        }

        return score;
    }

    /**
     * Get the fields where matches occurred
     */
    private getMatchedFields(faq: FAQ, keywords: string[]): string[] {
        const matchedFields: string[] = [];
        
        const questionText = faq.question.toLowerCase();
        const answerText = faq.answer.toLowerCase();
        const tagsText = faq.tags.join(' ').toLowerCase();

        let hasQuestionMatch = false;
        let hasAnswerMatch = false;
        let hasTagMatch = false;

        for (const keyword of keywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            
            if (questionText.match(regex) && !hasQuestionMatch) {
                matchedFields.push('question');
                hasQuestionMatch = true;
            }
            
            if (answerText.match(regex) && !hasAnswerMatch) {
                matchedFields.push('answer');
                hasAnswerMatch = true;
            }
            
            if (tagsText.match(regex) && !hasTagMatch) {
                matchedFields.push('tags');
                hasTagMatch = true;
            }
        }

        return matchedFields;
    }

    /**
     * Get FAQ statistics
     */
    async getStatistics(): Promise<FAQStatistics> {
        try {
            const [
                totalFAQs,
                activeFAQs,
                inactiveFAQs,
                viewStats,
                tagStats
            ] = await Promise.all([
                this.faqModel.countDocuments().exec(),
                this.faqModel.countDocuments({ isActive: true }).exec(),
                this.faqModel.countDocuments({ isActive: false }).exec(),
                this.faqModel.aggregate([
                    { $group: { _id: null, totalViews: { $sum: '$viewCount' }, avgViews: { $avg: '$viewCount' } } }
                ]).exec(),
                this.faqModel.aggregate([
                    { $unwind: '$tags' },
                    { $group: { _id: '$tags', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).exec()
            ]);

            const totalViews = viewStats.length > 0 ? viewStats[0].totalViews : 0;
            const averageViews = viewStats.length > 0 ? Math.round(viewStats[0].avgViews * 100) / 100 : 0;

            const topTags = tagStats.map(tag => ({
                tag: tag._id,
                count: tag.count
            }));

            return {
                totalFAQs,
                activeFAQs,
                inactiveFAQs,
                totalViews,
                averageViews,
                topTags
            };

        } catch (error) {
            this.logger.error(`Failed to get FAQ statistics: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to retrieve FAQ statistics');
        }
    }
}