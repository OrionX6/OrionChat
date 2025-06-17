import Anthropic from '@anthropic-ai/sdk';
import { CostOptimizedProvider, ChatMessage, StreamChunk, StreamOptions } from '../types';
import { createClient } from '@supabase/supabase-js';

export class ClaudeHaikuProvider implements CostOptimizedProvider {
  name = 'anthropic';
  models = ['claude-3-haiku-20240307', 'claude-3-5-haiku-20241022'];
  costPerToken = { input: 0.08, output: 0.40 }; // per 1k tokens in cents (updated for 3.5 pricing)
  maxTokens = 200000;
  supportsFunctions = true;
  supportsVision = true; // Claude 3.5 Haiku supports vision
  
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ 
      apiKey
    });
  }

  private async convertToClaudeContent(content: string | any[], options?: StreamOptions): Promise<any> {
    // Claude 3.5 Haiku supports text and PDFs via base64 encoding
    if (Array.isArray(content)) {
      const contentBlocks = [];

      for (const item of content) {
        if (item.type === 'text') {
          contentBlocks.push({
            type: 'text',
            text: item.text || ''
          });
        } else if (item.type === 'file_id') {
          // Get PDF from storage and convert to base64
          try {
            const base64Data = await this.getPDFAsBase64(item.file_id, options?.userId);
            if (base64Data) {
              contentBlocks.push({
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data
                }
              });
            } else {
              contentBlocks.push({
                type: 'text',
                text: '[PDF file could not be loaded]'
              });
            }
          } catch (error) {
            console.error('Error loading PDF for Claude:', error);
            contentBlocks.push({
              type: 'text',
              text: '[PDF file could not be loaded]'
            });
          }
        } else if (item.type === 'image') {
          // Handle image content for Claude 3.5 Haiku vision support
          if (item.source?.type === 'base64' && item.source?.data) {
            // Image already in Claude format from API route
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: item.source.media_type || 'image/jpeg',
                data: item.source.data
              }
            });
          } else if (item.image?.base64) {
            // Legacy format - convert to Claude format
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: item.image.mimeType || 'image/jpeg',
                data: item.image.base64
              }
            });
          } else if (item.image?.url) {
            // For image URLs, we need to fetch and convert to base64
            try {
              const response = await fetch(item.image.url);
              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              const mimeType = response.headers.get('content-type') || item.image.mimeType || 'image/jpeg';
              
              contentBlocks.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64
                }
              });
            } catch (error) {
              console.error('Error fetching image for Claude:', error);
              contentBlocks.push({
                type: 'text',
                text: '[Image could not be loaded]'
              });
            }
          } else {
            contentBlocks.push({
              type: 'text',
              text: '[Invalid image format]'
            });
          }
        } else if (item.type === 'file_uri') {
          contentBlocks.push({
            type: 'text',
            text: '[PDF file content - not available for Claude 3.5 Haiku]'
          });
        }
      }

      return contentBlocks;
    }
    return content;
  }

  private async getPDFAsBase64(anthropicFileId: string, userId?: string): Promise<string | null> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials for PDF retrieval');
      return null;
    }

    try {
      // Create Supabase client with service role key to access storage
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Find the file record by anthropic_file_id
      const { data: fileRecord, error: fileError } = await supabase
        .from('files')
        .select('storage_path, user_id')
        .eq('anthropic_file_id', anthropicFileId)
        .single();

      if (fileError || !fileRecord) {
        console.error('File record not found for anthropic_file_id:', anthropicFileId);
        return null;
      }

      // Verify user ownership if userId provided
      if (userId && fileRecord.user_id !== userId) {
        console.error('User does not own this file');
        return null;
      }

      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('attachments')
        .download(fileRecord.storage_path);

      if (downloadError || !fileData) {
        console.error('Failed to download file from storage:', downloadError);
        return null;
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) {
      console.error('Error retrieving PDF for base64 conversion:', error);
      return null;
    }
  }
  
  async *stream(messages: ChatMessage[], options: StreamOptions = {}): AsyncIterable<StreamChunk> {
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      // Check if any message has PDF content that requires beta support
      const hasPDFContent = conversationMessages.some(msg => 
        Array.isArray(msg.content) && 
        msg.content.some(item => item.type === 'file_id')
      );

      const createParams: any = {
        model: options.model || 'claude-3-5-haiku-20241022', // Use the actual Haiku model
        max_tokens: options.maxTokens || 8192,
        temperature: options.temperature || 0.7,
        system: systemMessage ? await this.convertToClaudeContent(systemMessage.content, options) : undefined,
        messages: await Promise.all(conversationMessages.map(async msg => ({
          role: msg.role as 'user' | 'assistant',
          content: await this.convertToClaudeContent(msg.content, options)
        }))),
        stream: true
      };

      // Add beta header only for PDF support when needed
      const streamOptions = hasPDFContent ? {
        headers: {
          'anthropic-beta': 'pdfs-2024-09-25'
        }
      } : {};

      const stream = this.client.messages.stream(createParams, streamOptions);
      
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
  
  async embed(_text: string): Promise<number[]> {
    // Claude doesn't provide embeddings, so we'll use a placeholder
    // In a real implementation, you might want to use a different service
    throw new Error('Claude does not support embeddings. Use OpenAI for embeddings.');
  }
}