import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions, MultimodalContent } from '../types';

export class GeminiFlashProvider implements CostOptimizedProvider {
  name = 'google';
  models = ['gemini-2.0-flash-exp', 'gemini-2.5-flash-preview-05-20'];
  costPerToken = { input: 0.10, output: 0.40 }; // per 1k tokens in cents (updated for 2.0 pricing)
  maxTokens = 1000000;
  supportsFunctions = true;
  supportsVision = true;
  
  private client: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private convertToGeminiParts(content: string | MultimodalContent[]): any[] {
    if (Array.isArray(content)) {
      return content.map(item => {
        if (item.type === 'text' && item.text) {
          return { text: item.text };
        } else if (item.type === 'image' && item.image?.base64) {
          return {
            inlineData: {
              mimeType: item.image.mimeType || 'image/jpeg',
              data: item.image.base64
            }
          };
        } else if (item.type === 'file_uri' && item.file_uri) {
          return {
            fileData: {
              fileUri: item.file_uri,
              mimeType: item.mime_type || 'application/pdf'
            }
          };
        }
        // Skip empty or unsupported content types
        return null;
      }).filter(part => part !== null); // Remove null entries
    }
    return [{ text: content }];
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      // Use the model from options or default to 2.5 Flash for maximum output capability
      const modelToUse = options.model || 'gemini-2.5-flash-preview-05-20';
      const maxOutputTokens = Math.min(options.maxTokens || 65536, 65536);
      
      console.log(`🔥 GEMINI SETUP: Using model ${modelToUse} with maxOutputTokens: ${maxOutputTokens}`);
      
      const model = this.client.getGenerativeModel({ 
        model: modelToUse,
        generationConfig: {
          maxOutputTokens, // Force maximum for Gemini 2.5 Flash
          temperature: options.temperature || 0.7,
          candidateCount: 1,
          stopSequences: [],
          topK: undefined, // Remove any top-k restrictions
          topP: undefined, // Remove any top-p restrictions
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });
      
      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: this.convertToGeminiParts(msg.content)
      }));
      
      const lastMessage = messages[messages.length - 1];
      const lastMessageParts = this.convertToGeminiParts(lastMessage.content);

      console.log('🔍 GEMINI DEBUG: Last message content:', JSON.stringify(lastMessage.content, null, 2));
      console.log('🔍 GEMINI DEBUG: Converted parts:', JSON.stringify(lastMessageParts, null, 2));

      // Check total content size
      const totalContentSize = JSON.stringify(lastMessageParts).length;
      console.log(`📏 GEMINI DEBUG: Total content size: ${totalContentSize} characters`);

      if (totalContentSize > 1000000) { // 1MB limit check
        console.warn(`⚠️ GEMINI WARNING: Content size (${totalContentSize}) is very large, this might cause API issues`);
      }

      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(lastMessageParts);
      
      let chunkCount = 0;
      let totalCharacters = 0;
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          chunkCount++;
          totalCharacters += text.length;
          
          if (chunkCount % 10 === 0) { // Log every 10 chunks
            console.log(`📝 Gemini streaming: chunk ${chunkCount}, total chars: ${totalCharacters}`);
          }
          
          yield {
            content: text,
            done: false
          };
        }
      }
      
      console.log(`📊 Gemini streaming complete: ${chunkCount} chunks, ${totalCharacters} total characters`);
      
      // Final chunk with usage info and finish reason
      const response = await result.response;
      const finishReason = response.candidates?.[0]?.finishReason;
      
      // Log detailed information about generation completion
      console.log(`Gemini generation completed:`, {
        finishReason,
        promptTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
        maxOutputTokensUsed: response.usageMetadata?.candidatesTokenCount
      });
      
      // Log if generation was cut short
      if (finishReason && finishReason !== 'STOP') {
        console.error(`🚨 GEMINI GENERATION TRUNCATED! Reason: ${finishReason}. This should not happen with max tokens set to 65536.`);
      }
      
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