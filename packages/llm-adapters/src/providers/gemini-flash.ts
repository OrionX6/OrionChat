import { GoogleGenerativeAI } from '@google/generative-ai';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';

export class GeminiFlashProvider implements CostOptimizedProvider {
  name = 'google';
  models = ['gemini-2.0-flash-exp'];
  costPerToken = { input: 0.0075, output: 0.03 }; // per 1k tokens in cents
  maxTokens = 1000000;
  supportsFunctions = true;
  
  private client: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const model = this.client.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          maxOutputTokens: Math.min(options.maxTokens || 4096, 8192),
          temperature: options.temperature || 0.7
        }
      });
      
      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      const lastMessage = messages[messages.length - 1];
      
      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(lastMessage.content);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield {
          content: text,
          done: false
        };
      }
      
      // Final chunk with usage info
      const response = await result.response;
      yield {
        content: '',
        done: true,
        usage: response.usageMetadata ? {
          prompt_tokens: response.usageMetadata.promptTokenCount || 0,
          completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
          total_tokens: response.usageMetadata.totalTokenCount || 0
        } : undefined
      };
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async embed(text: string): Promise<number[]> {
    try {
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values || [];
    } catch (error) {
      throw new Error(`Gemini embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}