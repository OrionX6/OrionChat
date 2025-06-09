import OpenAI from 'openai';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';

export class OpenAIMiniProvider implements CostOptimizedProvider {
  name = 'openai';
  models = ['gpt-4o-mini'];
  costPerToken = { input: 0.015, output: 0.06 }; // per 1k tokens in cents
  maxTokens = 128000;
  supportsFunctions = true;
  
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        max_tokens: Math.min(options.maxTokens || 4096, this.maxTokens),
        temperature: options.temperature || 0.7,
        ...(options.functions && { functions: options.functions })
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        const finishReason = chunk.choices[0]?.finish_reason;
        
        yield {
          content,
          done: finishReason === 'stop' || finishReason === 'length',
          usage: chunk.usage ? {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens
          } : undefined
        };
      }
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      
      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`OpenAI embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}