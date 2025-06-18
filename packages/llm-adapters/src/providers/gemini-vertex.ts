import { VertexAI } from '@google-cloud/vertexai';
import * as path from 'path';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions, MultimodalContent } from '../types';

export class GeminiVertexProvider implements CostOptimizedProvider {
  name = 'google-vertex';
  models = ['gemini-2.0-flash-exp', 'gemini-2.5-flash-preview-05-20'];
  costPerToken = { input: 0.10, output: 0.40 }; // per 1k tokens in cents
  maxTokens = 1000000;
  supportsFunctions = true;
  supportsVision = true;
  
  private vertexAI: VertexAI;
  
  constructor(projectId: string, location: string = 'us-central1', keyFilePath?: string) {
    // Set up authentication options for serverless environments
    const authOptions: any = {};
    
    // First, try to use GOOGLE_APPLICATION_CREDENTIALS as a JSON string (Vercel-friendly)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        // Parse the credentials JSON string
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        authOptions.credentials = credentials;
        console.log('🔐 Using GOOGLE_APPLICATION_CREDENTIALS JSON for Vertex AI authentication');
      } catch (error) {
        console.log('⚠️ GOOGLE_APPLICATION_CREDENTIALS is not valid JSON, trying as file path...');
        // Fallback to treating it as a file path (local development)
        authOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
    } else if (keyFilePath) {
      // Use explicit key file path (local development)
      authOptions.keyFilename = keyFilePath;
      console.log('🔐 Using explicit service account key file for Vertex AI authentication');
    } else {
      // Try to find key file in .google folder (local development fallback)
      const defaultKeyPath = path.join(__dirname, '.google', 'service-account-key.json');
      try {
        authOptions.keyFilename = defaultKeyPath;
        console.log('🔐 Using default key file path for Vertex AI authentication:', defaultKeyPath);
      } catch (error) {
        console.warn('⚠️ No authentication method found. Please set GOOGLE_APPLICATION_CREDENTIALS as JSON or provide keyFilePath');
      }
    }
    
    // Initialize Vertex AI with explicit auth options for serverless environments
    this.vertexAI = new VertexAI({
      project: projectId,
      location: location,
      googleAuthOptions: authOptions,
    });
    
    console.log(`🌐 Vertex AI initialized for project: ${projectId}, location: ${location}`);
    console.log('🔐 Auth method:', authOptions.credentials ? 'JSON credentials' : authOptions.keyFilename ? 'Key file' : 'Default auth');
  }

  private convertToVertexParts(content: string | MultimodalContent[]): any[] {
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
        return null;
      }).filter(part => part !== null);
    }
    return [{ text: content }];
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const modelToUse = options.model || 'gemini-2.5-flash-preview-05-20';
      const maxOutputTokens = Math.min(options.maxTokens || 65536, 65536);
      
      console.log(`🔥 VERTEX AI SETUP: Using model ${modelToUse} with maxOutputTokens: ${maxOutputTokens}, webSearch: ${options.webSearch}`);
      
      // Configure tools for web search if enabled (Vertex AI uses different syntax)
      const tools = options.webSearch ? [{ 
        google_search: {}
      } as any] : undefined;
      
      if (options.webSearch) {
        console.log('🌐 VERTEX AI: Enabling native Google Search grounding...');
      }
      
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: modelToUse,
        generationConfig: {
          maxOutputTokens,
          temperature: options.temperature || 0.7,
          candidateCount: 1,
        },
        tools,
      });
      
      // Convert messages to Vertex AI format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: this.convertToVertexParts(msg.content)
      }));
      
      const lastMessage = messages[messages.length - 1];
      const lastMessageParts = this.convertToVertexParts(lastMessage.content);

      console.log('🔍 VERTEX AI DEBUG: Last message content:', JSON.stringify(lastMessage.content, null, 2));
      console.log('🔍 VERTEX AI DEBUG: Converted parts:', JSON.stringify(lastMessageParts, null, 2));

      const chat = generativeModel.startChat({ history });
      const result = await chat.sendMessageStream(lastMessageParts);
      
      let chunkCount = 0;
      let totalCharacters = 0;
      
      for await (const chunk of result.stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          chunkCount++;
          totalCharacters += text.length;
          
          if (chunkCount % 10 === 0) { // Log every 10 chunks
            console.log(`📝 Vertex AI streaming: chunk ${chunkCount}, total chars: ${totalCharacters}`);
          }
          
          yield {
            content: text,
            done: false
          };
        }
      }
      
      console.log(`📊 Vertex AI streaming complete: ${chunkCount} chunks, ${totalCharacters} total characters`);
      
      // Final chunk with usage info and finish reason
      const response = await result.response;
      const finishReason = response.candidates?.[0]?.finishReason;
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      
      // Log grounding information if web search was used
      if (options.webSearch && groundingMetadata) {
        console.log('🌐 VERTEX AI WEB SEARCH GROUNDING:', {
          searchQueries: groundingMetadata.webSearchQueries,
          groundingSources: groundingMetadata.groundingChunks?.length || 0,
          searchEntryPoint: groundingMetadata.searchEntryPoint?.renderedContent ? 'Available' : 'None'
        });
      }
      
      // Log detailed information about generation completion
      console.log(`Vertex AI generation completed:`, {
        finishReason,
        promptTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
        webSearchUsed: !!groundingMetadata
      });
      
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
      throw new Error(`Vertex AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async embed(_text: string): Promise<number[]> {
    try {
      // For embeddings, use a different approach with Vertex AI
      // This is a placeholder - actual embedding implementation may vary
      return [];
    } catch (error) {
      throw new Error(`Vertex AI embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}