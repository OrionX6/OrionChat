import Anthropic from '@anthropic-ai/sdk';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';

export class ClaudeHaikuProvider implements CostOptimizedProvider {
  name = 'anthropic';
  models = ['claude-3-haiku-20240307'];
  costPerToken = { input: 0.025, output: 0.125 }; // per 1k tokens in cents
  maxTokens = 200000;
  supportsFunctions = true;
  
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      const stream = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: Math.min(options.maxTokens || 4096, 4096), // Haiku has lower limits
        temperature: options.temperature || 0.7,
        system: systemMessage?.content,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        stream: true
      });
      
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield {
            content: chunk.delta.text,
            done: false
          };
        } else if (chunk.type === 'message_stop') {
          yield {
            content: '',
            done: true,
            usage: chunk.usage ? {
              prompt_tokens: chunk.usage.input_tokens,
              completion_tokens: chunk.usage.output_tokens,
              total_tokens: chunk.usage.input_tokens + chunk.usage.output_tokens
            } : undefined
          };
        }
      }
    } catch (error) {
      throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async embed(text: string): Promise<number[]> {
    // Claude doesn't provide embeddings, so we'll use a placeholder
    // In a real implementation, you might want to use a different service
    throw new Error('Claude does not support embeddings. Use OpenAI for embeddings.');
  }
}