import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';

export class DeepSeekR1Provider implements CostOptimizedProvider {
  name = 'deepseek';
  models = ['deepseek-r1'];
  costPerToken = { input: 0.055, output: 0.219 }; // per 1k tokens in cents (updated pricing)
  maxTokens = 128000;
  supportsFunctions = true;
  supportsVision = false; // DeepSeek R1 is text-only
  
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl = 'https://api.deepseek.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private convertToTextContent(content: string | any[]): string {
    // Since DeepSeek R1 is text-only, convert multimodal to text
    if (Array.isArray(content)) {
      return content
        .map(item => {
          if (item.type === 'text') {
            return item.text || '';
          } else if (item.type === 'image') {
            return '[Image content - not supported by DeepSeek R1]';
          }
          return '';
        })
        .join('');
    }
    return content;
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || 'deepseek-r1',
          messages: messages.map(msg => ({
            role: msg.role,
            content: this.convertToTextContent(msg.content)
          })),
          stream: true,
          max_tokens: options.maxTokens || 64000, // DeepSeek R1 max output is 64K tokens
          temperature: options.temperature || 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              const finishReason = parsed.choices?.[0]?.finish_reason;
              
              yield {
                content,
                done: finishReason === 'stop' || finishReason === 'length',
                usage: parsed.usage ? {
                  prompt_tokens: parsed.usage.prompt_tokens,
                  completion_tokens: parsed.usage.completion_tokens,
                  total_tokens: parsed.usage.total_tokens
                } : undefined
              };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`DeepSeek API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async embed(text: string): Promise<number[]> {
    // DeepSeek doesn't provide embeddings, so we'll use a placeholder
    throw new Error('DeepSeek does not support embeddings. Use OpenAI for embeddings.');
  }
}