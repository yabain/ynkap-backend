import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeEntry {
  id: string;
  keywords: string[];
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private knowledge: KnowledgeEntry[] = [];
  private readonly huggingFaceApiUrl = 'https://momo555-flan-t5-test.hf.space/run/chat';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.loadKnowledge();
  }

  /**
   * Load knowledge base from JSON file
   */
  private loadKnowledge(): void {
    try {
      const knowledgePath = path.resolve(process.cwd(), 'resources/knowledge.json');
      const knowledgeData = fs.readFileSync(knowledgePath, 'utf8');
      this.knowledge = JSON.parse(knowledgeData);
      this.logger.log(`Loaded ${this.knowledge.length} knowledge entries`);
    } catch (error) {
      this.logger.error('Failed to load knowledge base:', error);
      this.knowledge = [];
    }
  }

  /**
   * Retrieve relevant context from knowledge base using keyword scoring
   */
  private retrieveContext(message: string): string {
    const messageLower = message.toLowerCase();

    const scoredEntries = this.knowledge
      .map(entry => {
        const matchCount = entry.keywords.reduce(
          (count, kw) => count + (messageLower.includes(kw.toLowerCase()) ? 1 : 0),
          0
        );
        return { entry, matchCount };
      })
      .filter(x => x.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    if (scoredEntries.length === 0) {
      const generalEntry = this.knowledge.find(entry => entry.id === 'general_help');
      return generalEntry ? generalEntry.content : '';
    }

    // Join top 3 matching entries as context
    return scoredEntries.slice(0, 3).map(x => x.entry.content).join('\n\n');
  }

  /**
   * Generate AI response using Hugging Face API
   */
  async generateResponse(message: string): Promise<string> {
    if (!message?.trim()) return "Please provide a message.";

    const context = this.retrieveContext(message);
    const huggingFaceToken = this.configService.get<string>('HUGGING_FACE_TOKEN');

    if (!huggingFaceToken) return this.getFallbackResponse(context);

    try {
      const prompt = `
You are an expert assistant for our application. Use the context below to answer the user's question. 
If the answer is not in the context, politely say you don't know.

Context:
${context}

Question:
${message}

Answer:
`;

      const response = await firstValueFrom(
        this.httpService.post(
          this.huggingFaceApiUrl,
          { inputs: prompt, parameters: { max_length: 150, temperature: 0.7, do_sample: true } },
          { headers: { 'Authorization': `Bearer ${huggingFaceToken}`, 'Content-Type': 'application/json' }, timeout: 15000 }
        )
      );

      const generatedText = response.data?.[0]?.generated_text || response.data?.generated_text || '';
      return this.extractAiResponse(generatedText, prompt) || this.getFallbackResponse(context);

    } catch (error) {
      this.logger.error('Error generating AI response:', error.message || error);
      return this.getFallbackResponse(context);
    }
  }

  /**
   * Extract AI response from generated text
   */
  private extractAiResponse(generatedText: string, originalPrompt: string): string {
    if (!generatedText) return '';

    const response = generatedText.replace(originalPrompt, '').trim();
    const cleanResponse = response
      .split('\n')[0]
      .replace(/^(Assistant:|User:)\s*/i, '')
      .trim();

    return cleanResponse.length > 10 ? cleanResponse : '';
  }

  /**
   * Provide fallback response when AI API fails
   */
  private getFallbackResponse(context: string): string {
    return context
      ? `Here's what I found in our knowledge base:\n\n${context}`
      : "I'm here to help! Could you please provide more details about your issue so I can assist you better?";
  }
}
