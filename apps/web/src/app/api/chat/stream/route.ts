import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LLMRouter } from '@orion-chat/llm-adapters';
import type { ChatMessage } from '@orion-chat/shared-types/src/llm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, conversationId, provider, model } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!conversationId || !provider || !model) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Verify conversation belongs to user (optimized query)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('max_tokens, temperature, message_count, total_tokens_used')
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
    });

    // Convert messages to the format expected by LLM providers
    const chatMessages: ChatMessage[] = messages.map((msg: { role: 'user' | 'assistant' | 'system'; content: string; metadata?: Record<string, unknown> }) => ({
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || {}
    }));

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
          console.log(`🚀 Starting generation for ${provider}/${model} with maxTokens: ${maxTokensUsed} (model limit: ${modelMaxTokens})`);

          // Stream the response from the LLM
          for await (const chunk of router.stream({
            messages: chatMessages,
            provider: provider as 'openai' | 'anthropic' | 'google' | 'deepseek',
            model,
            userId: user.id,
            conversationId,
            options: {
              maxTokens: maxTokensUsed, // Use high default to accommodate full model capabilities
              temperature: conversation.temperature || 0.7,
            }
          })) {
            fullResponse += chunk.content;
            tokenCount += 1;
            
            // Send chunk to client immediately
            const data = JSON.stringify({
              content: chunk.content,
              done: chunk.done
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
                    provider: provider,
                    model: model,
                    tokens_used: tokenCount,
                    response_time_ms: responseTime,
                    finish_reason: 'stop'
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
