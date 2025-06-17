import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';

export class DeepSeekR1Provider implements CostOptimizedProvider {
  name = 'deepseek';
  models = ['deepseek-reasoner'];
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
          model: options.model || 'deepseek-reasoner',
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
        const errorText = await response.text();
        console.error('DeepSeek API error details:', errorText);
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            chunkCount++;
            console.log(`🧠 DeepSeek R1 chunk ${chunkCount}:`, data);
            
            if (data === '[DONE]') {
              console.log('🧠 DeepSeek R1 stream complete');
              yield { content: '', done: true };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              // Only log if we have interesting content (not just null reasoning_content)
              if (parsed.choices?.[0]?.delta?.reasoning_content || 
                  (parsed.choices?.[0]?.delta?.content && parsed.choices[0].delta.content.length > 5)) {
                console.log('🧠 DeepSeek R1 raw response:', JSON.stringify(parsed, null, 2));
              }
              
              const choice = parsed.choices?.[0];
              const delta = choice?.delta;
              const finishReason = choice?.finish_reason;
              
              // Handle thinking content (reasoning process) - check multiple possible fields
              const thinking = delta?.reasoning_content || delta?.reasoning || '';
              const content = delta?.content || '';
              
              // Also check if reasoning content is at the choice level
              const choiceReasoning = choice?.reasoning_content || '';
              
              // Only log when we find reasoning content or have debugging info
              if (thinking || choiceReasoning || chunkCount <= 10) {
                console.log(`🧠 DeepSeek R1 chunk ${chunkCount} parsed:`, {
                  thinking: thinking.length > 0 ? `${thinking.substring(0, 100)}...` : 'none',
                  choiceReasoning: choiceReasoning.length > 0 ? `${choiceReasoning.substring(0, 100)}...` : 'none',
                  content: content.length > 0 ? `${content.substring(0, 50)}...` : 'none',
                  finishReason,
                  hasReasoningContent: !!delta?.reasoning_content,
                  hasChoiceReasoning: !!choice?.reasoning_content,
                  deltaKeys: Object.keys(delta || {}),
                  choiceKeys: Object.keys(choice || {})
                });
              }
              
              // If we have thinking content, yield it as thinking (check both locations)
              const actualThinking = thinking || choiceReasoning;
              if (actualThinking) {
                console.log('🧠 Found thinking content!', actualThinking.substring(0, 200));
                yield {
                  content: '',
                  thinking: actualThinking,
                  isThinking: true,
                  done: false
                };
              }
              
              // If we have regular content, yield it normally
              if (content) {
                yield {
                  content,
                  done: finishReason === 'stop' || finishReason === 'length',
                  usage: parsed.usage ? {
                    prompt_tokens: parsed.usage.prompt_tokens,
                    completion_tokens: parsed.usage.completion_tokens,
                    total_tokens: parsed.usage.total_tokens
                  } : undefined
                };
              }
              
              // Handle completion without content
              if (finishReason && !content && !thinking) {
                yield {
                  content: '',
                  done: true,
                  usage: parsed.usage ? {
                    prompt_tokens: parsed.usage.prompt_tokens,
                    completion_tokens: parsed.usage.completion_tokens,
                    total_tokens: parsed.usage.total_tokens
                  } : undefined
                };
              }
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
  
  async embed(_text: string): Promise<number[]> {
    // DeepSeek doesn't provide embeddings, so we'll use a placeholder
    throw new Error('DeepSeek does not support embeddings. Use OpenAI for embeddings.');
  }
}