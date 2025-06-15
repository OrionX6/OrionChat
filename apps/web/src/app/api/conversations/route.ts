import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ conversations })
    
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { title, model_provider, model_name } = await request.json()
    
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
    
    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title || 'New Conversation',
        model_provider: model_provider || 'openai',
        model_name: model_name || 'gpt-4o-mini',
        max_tokens: getModelMaxTokens(model_provider || 'openai') // Use model-specific limit
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ conversation })
    
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}