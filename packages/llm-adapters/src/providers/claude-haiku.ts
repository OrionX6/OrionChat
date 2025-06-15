import Anthropic from '@anthropic-ai/sdk';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';

export class ClaudeHaikuProvider implements CostOptimizedProvider {
  name = 'anthropic';
  models = ['claude-3-haiku-20240307', 'claude-3-5-haiku-20241022'];
  costPerToken = { input: 0.08, output: 0.40 }; // per 1k tokens in cents (updated for 3.5 pricing)
  maxTokens = 200000;
  supportsFunctions = true;
  supportsVision = false; // Claude 3.5 Haiku is text-only
  
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private convertToClaudeContent(content: string | any[]): string {
    // Since Claude 3.5 Haiku is text-only, convert multimodal to text
    if (Array.isArray(content)) {
      return content
        .map(item => {
          if (item.type === 'text') {
            return item.text || '';
          } else if (item.type === 'image') {
            return '[Image content - not supported by Claude 3.5 Haiku]';
          }
          return '';
        })
        .join('');
    }
    return content;
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Use the model from options or default to 3.5 Haiku
      const modelToUse = options.model || 'claude-3-5-haiku-20241022';
      
      const stream = await this.client.messages.create({
        model: modelToUse,
        max_tokens: options.maxTokens || 8192, // Claude 3.5 Haiku max output is 8,192 tokens
        temperature: options.temperature || 0.7,
        system: systemMessage ? this.convertToClaudeContent(systemMessage.content) : undefined,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: this.convertToClaudeContent(msg.content)
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
            done: true
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