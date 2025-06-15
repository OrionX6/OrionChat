import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test database connection by counting conversations
    const { data: conversations, error: dbError } = await supabase
      .from('conversations')
      .select('id, title, created_at, max_tokens')
      .limit(10)
    
    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: dbError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        conversationsCount: conversations?.length || 0,
        conversations: conversations || []
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get model-specific max tokens
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
    
    // Get all conversations that need updating
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, model_provider, max_tokens')
    
    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch conversations', 
        details: fetchError.message 
      }, { status: 500 })
    }
    
    // Update each conversation with correct max_tokens for its provider
    const updates = conversations?.map(conv => {
      const correctMaxTokens = getModelMaxTokens(conv.model_provider);
      return supabase
        .from('conversations')
        .update({ max_tokens: correctMaxTokens })
        .eq('id', conv.id)
    }) || [];
    
    const results = await Promise.all(updates);
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Some updates failed', 
        details: errors 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'All conversations updated with model-specific max_tokens',
      data: {
        updatedCount: conversations?.length || 0,
        conversationsUpdated: conversations?.map(conv => ({
          id: conv.id,
          provider: conv.model_provider,
          newMaxTokens: getModelMaxTokens(conv.model_provider)
        })) || []
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}