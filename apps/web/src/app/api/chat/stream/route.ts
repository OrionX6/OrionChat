import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LLMRouter } from '@orion-chat/llm-adapters';
import type { ChatMessage, MultimodalContent } from '@orion-chat/shared-types/src/llm';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview_url?: string;
}

interface AttachmentContent {
  type: 'text' | 'image_url' | 'image_base64' | 'pdf' | 'file_uri' | 'file_id';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
  image_base64?: {
    data: string;
    mimeType: string;
  };
  pdf_content?: string;
  file_uri?: string;
  file_id?: string;
  mime_type?: string;
}

// Helper function to detect image format from base64 data
function detectImageFormat(base64Data: string): string {
  // Convert first few bytes of base64 to check magic numbers
  const binaryString = atob(base64Data.substring(0, 20));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Check magic numbers for common image formats
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'image/webp';
  }
  
  return 'image/jpeg'; // Default fallback
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processAttachments(attachments: FileAttachment[], supabase: any, provider: string): Promise<AttachmentContent[]> {
  const processedContent: AttachmentContent[] = [];

  for (const attachment of attachments) {
    try {
      if (attachment.type.startsWith('image/')) {
        // For images, handle differently based on provider
        if (attachment.preview_url) {
          if (provider === 'google' || provider === 'anthropic') {
            // Gemini and Claude require base64 data, so download and convert the image
            try {
              console.log(`Downloading image for ${provider}:`, attachment.preview_url);
              const response = await fetch(attachment.preview_url);
              if (!response.ok) {
                throw new Error(`Failed to download image: ${response.statusText}`);
              }

              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              
              // Detect the actual image format from base64 data
              const detectedMimeType = detectImageFormat(base64);
              const responseMimeType = response.headers.get('content-type');
              const finalMimeType = detectedMimeType; // Use detected format for accuracy
              
              console.log(`Image MIME type detection:`, {
                original: attachment.type,
                response: responseMimeType,
                detected: detectedMimeType,
                final: finalMimeType
              });

              processedContent.push({
                type: 'image_base64',
                image_base64: {
                  data: base64,
                  mimeType: finalMimeType
                }
              });
              console.log(`Successfully converted image to base64 for ${provider}`);
            } catch (error) {
              console.error(`Failed to download/convert image for ${provider}:`, error);
              // Fallback: skip this image
            }
          } else {
            // OpenAI and others can use URLs directly
            processedContent.push({
              type: 'image_url',
              image_url: {
                url: attachment.preview_url,
                detail: 'auto'
              }
            });
          }
        }
      } else if (attachment.type === 'application/pdf') {
        // For PDFs, retrieve provider file IDs from database
        console.log('📄 Retrieving PDF data for attachment:', attachment.id);
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .select('gemini_file_uri, anthropic_file_id, openai_file_id, processing_status, original_name, extracted_text')
          .eq('id', attachment.id)
          .single();

        if (fileError) {
          console.error('❌ Error retrieving PDF data:', fileError);
        } else {
          console.log('📄 PDF data retrieved:', {
            name: fileData.original_name,
            processing_status: fileData.processing_status,
            has_gemini_uri: !!fileData.gemini_file_uri,
            has_anthropic_id: !!fileData.anthropic_file_id,
            has_openai_id: !!fileData.openai_file_id,
            provider: provider
          });
        }

        // Handle different providers with their native file APIs
        if (provider === 'google' && fileData?.gemini_file_uri) {
          // For Gemini, use the file URI directly
          processedContent.push({
            type: 'file_uri',
            file_uri: fileData.gemini_file_uri,
            mime_type: 'application/pdf'
          });
        } else if (provider === 'anthropic' && fileData?.anthropic_file_id) {
          // For Anthropic, use the file ID directly
          processedContent.push({
            type: 'file_id',
            file_id: fileData.anthropic_file_id,
            mime_type: 'application/pdf'
          });
        } else if (provider === 'openai' && fileData?.openai_file_id) {
          // For OpenAI, use the file ID directly
          processedContent.push({
            type: 'file_id',
            file_id: fileData.openai_file_id,
            mime_type: 'application/pdf'
          });
        } else {
          // For other providers or fallback, use extracted text if available
          if (fileData?.extracted_text) {
            processedContent.push({
              type: 'pdf',
              pdf_content: fileData.extracted_text
            });
          } else {
            console.warn(`⚠️ No native file support available for provider ${provider} and PDF ${attachment.id}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing attachment ${attachment.id}:`, error);
    }
  }

  return processedContent;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, conversationId, provider, model, attachments, webSearch } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!conversationId || !provider || !model) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Verify conversation belongs to user (optimized query)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('max_tokens, temperature, message_count, total_tokens_used, is_web_search_enabled')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    // Initialize LLM Router with API keys
    const router = new LLMRouter({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      googleApiKey: process.env.GOOGLE_AI_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      // Vertex AI configuration
      googleProjectId: process.env.GOOGLE_CLOUD_PROJECT,
      googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      googleServiceAccountKeyPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    // Process attachments for the latest user message if they exist
    let processedAttachments: AttachmentContent[] = [];
    if (attachments && attachments.length > 0) {
      processedAttachments = await processAttachments(attachments, supabase, provider);
    }

    // Convert messages to the format expected by LLM providers
    const chatMessages: ChatMessage[] = messages.map((msg: { role: 'user' | 'assistant' | 'system'; content: string; metadata?: Record<string, unknown> }, index: number) => {
      const baseMessage = {
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {}
      };

      // Add multimodal content to the last user message if attachments exist
      if (msg.role === 'user' && index === messages.length - 1 && processedAttachments.length > 0) {
        // Check if the provider supports multimodal content
        const supportsMultimodal = provider === 'openai' || provider === 'google' || provider === 'anthropic';
        
        if (supportsMultimodal) {
          // For multimodal providers, format as structured content array
          const multimodalContent: MultimodalContent[] = [
            { type: 'text', text: msg.content },
            ...processedAttachments.map((attachment): MultimodalContent => {
              if (attachment.type === 'image_url') {
                console.log('Adding image URL to multimodal content:', attachment.image_url?.url);
                return {
                  type: 'image',
                  image: {
                    url: attachment.image_url?.url,
                    mimeType: 'image/jpeg' // Default, should be detected from file
                  }
                };
              } else if (attachment.type === 'image_base64') {
                if (provider === 'anthropic') {
                  const base64Data = attachment.image_base64?.data || '';
                  const declaredMimeType = attachment.image_base64?.mimeType || 'image/jpeg';
                  // Double-check the MIME type based on actual data for Claude
                  const actualMimeType = base64Data ? detectImageFormat(base64Data) : declaredMimeType;
                  const dataLength = base64Data.length;
                  
                  console.log('Adding base64 image to multimodal content for Claude:', {
                    declaredMimeType,
                    actualMimeType,
                    dataLength,
                    dataPreview: base64Data.substring(0, 50) + '...'
                  });
                  
                  return {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: actualMimeType,
                      data: base64Data
                    }
                  };
                } else {
                  console.log('Adding base64 image to multimodal content for Gemini');
                  return {
                    type: 'image',
                    image: {
                      base64: attachment.image_base64?.data,
                      mimeType: attachment.image_base64?.mimeType || 'image/jpeg'
                    }
                  };
                }
              } else if (attachment.type === 'file_uri') {
                // For Gemini file URIs, use the file reference directly
                console.log('Adding file URI to multimodal content for Gemini:', attachment.file_uri);
                return {
                  type: 'file_uri',
                  file_uri: attachment.file_uri,
                  mime_type: attachment.mime_type
                };
              } else if (attachment.type === 'file_id') {
                // For Anthropic file IDs, use the file reference directly
                console.log('Adding file ID to multimodal content for Anthropic:', attachment.file_id);
                return {
                  type: 'file_id',
                  file_id: attachment.file_id,
                  mime_type: attachment.mime_type
                };
              } else if (attachment.type === 'pdf') {
                // For PDFs, include as text since most APIs don't support PDF directly
                return {
                  type: 'text',
                  text: `\n\n[PDF Content]:\n${attachment.pdf_content}`
                };
              }
              return { type: 'text', text: '' };
            })
          ];
          
          console.log('Sending multimodal content to', provider, ':', JSON.stringify(multimodalContent, null, 2));
          
          return {
            ...baseMessage,
            content: multimodalContent,
            metadata: { 
              ...baseMessage.metadata, 
              hasAttachments: true,
              attachmentTypes: processedAttachments.map(a => a.type)
            }
          };
        } else {
          // For text-only providers, append PDF content as text
          let textContent = msg.content;
          processedAttachments.forEach(attachment => {
            if (attachment.type === 'pdf' && attachment.pdf_content) {
              textContent += `\n\n[PDF Content from ${attachments.find((a: FileAttachment) => a.type === 'application/pdf')?.name}]:\n${attachment.pdf_content}`;
            } else if (attachment.type === 'image_url' || attachment.type === 'image_base64') {
              textContent += `\n\n[Image attached: ${attachments.find((a: FileAttachment) => a.type.startsWith('image/'))?.name}]`;
            }
          });
          
          return {
            ...baseMessage,
            content: textContent,
            metadata: { 
              ...baseMessage.metadata, 
              hasAttachments: true,
              attachmentTypes: processedAttachments.map(a => a.type),
              textOnlyFallback: true
            }
          };
        }
      }

      return baseMessage;
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          let tokenCount = 0;
          const startTime = Date.now();

          // Get model-specific max tokens to avoid API errors
          const getModelMaxTokens = (provider: string): number => {
            switch (provider) {
              case 'openai':
                return 16384; // GPT-4o-mini max output
              case 'anthropic':
                return 8192;  // Claude 3.5 Haiku max output
              case 'google':
                return 65536; // Gemini 2.5 Flash max output
              case 'deepseek':
                return 64000; // DeepSeek R1 max output
              default:
                return 16384; // Safe default
            }
          };

          const modelMaxTokens = getModelMaxTokens(provider);
          const maxTokensUsed = Math.min(conversation.max_tokens || modelMaxTokens, modelMaxTokens);
          // Smart provider routing: Use Vertex AI for Gemini models when search is enabled
          let actualProvider = provider;
          const isGeminiModel = provider === 'google' && (model === 'gemini-2.0-flash-exp' || model === 'gemini-2.5-flash-preview-05-20');
          const shouldUseVertexAI = isGeminiModel && webSearch && conversation.is_web_search_enabled;
          
          if (shouldUseVertexAI) {
            actualProvider = 'google-vertex';
            console.log(`🔄 Smart routing: Using Vertex AI for ${model} with search enabled`);
          }
          
          console.log(`🚀 Starting generation for ${actualProvider}/${model} with maxTokens: ${maxTokensUsed} (model limit: ${modelMaxTokens})`);

          // Track thinking content
          let fullThinkingContent = '';
          
          // Stream the response from the LLM
          for await (const chunk of router.stream({
            messages: chatMessages,
            provider: actualProvider as 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'deepseek',
            model,
            userId: user.id,
            conversationId,
            options: {
              maxTokens: maxTokensUsed, // Use high default to accommodate full model capabilities
              temperature: conversation.temperature || 0.7,
              webSearch: webSearch && conversation.is_web_search_enabled && (actualProvider === 'google-vertex' || actualProvider === 'deepseek'),
            }
          })) {
            fullResponse += chunk.content;
            tokenCount += 1;
            
            // Accumulate thinking content
            if (chunk.thinking) {
              fullThinkingContent += chunk.thinking;
            }
            
            // Send chunk to client immediately
            const data = JSON.stringify({
              content: chunk.content,
              done: chunk.done,
              thinking: chunk.thinking,
              isThinking: chunk.isThinking
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            if (chunk.done) {
              const endTime = Date.now();
              const responseTime = endTime - startTime;
              console.log(`✅ Generation completed: ${tokenCount} tokens in ${responseTime}ms. Final response length: ${fullResponse.length} characters`);

              // Perform database operations asynchronously (don't await)
              Promise.all([
                // Save the assistant's response
                supabase
                  .from('messages')
                  .insert({
                    conversation_id: conversationId,
                    user_id: user.id,
                    role: 'assistant',
                    content: fullResponse,
                    provider: provider, // Save original provider selection for UI consistency
                    model: model,
                    tokens_used: tokenCount,
                    response_time_ms: responseTime,
                    finish_reason: 'stop',
                    thinking_content: fullThinkingContent || null
                  })
                  .select('id')
                  .single(),
                // Update conversation stats
                supabase
                  .from('conversations')
                  .update({
                    updated_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                    message_count: (conversation.message_count || 0) + 1,
                    total_tokens_used: (conversation.total_tokens_used || 0) + tokenCount
                  })
                  .eq('id', conversationId)
              ]).catch(error => {
                console.error('Error saving message data:', error);
              });

              // Send final completion signal immediately
              const finalData = JSON.stringify({
                content: '',
                done: true,
                messageId: 'pending' // Will be updated on client side
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

              break;
            }
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            done: true
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
