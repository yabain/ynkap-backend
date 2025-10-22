import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiAnswerDto, AiResponseDto } from './dto/ai.dto';

@ApiTags('AI Support')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('answer')
  @ApiOperation({ summary: 'Get AI-generated answer for support ticket' })
  @ApiResponse({ status: 200, description: 'AI answer generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAiAnswer(@Body() aiAnswerDto: AiAnswerDto): Promise<AiResponseDto> {
    try {
      const { message } = aiAnswerDto;

      if (!message || message.trim().length === 0) {
        throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
      }

      // Generate AI response
      const answer = await this.aiService.generateResponse({ message });

      return {
        answer,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate AI response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}