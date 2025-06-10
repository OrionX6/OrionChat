import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test database connection by counting conversations
    const { data: conversations, error: dbError } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .limit(5)
    
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