export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          preferences: {
            default_model: string
            theme: string
            language: string
          } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: {
            default_model?: string
            theme?: string
            language?: string
          } | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: {
            default_model?: string
            theme?: string
            language?: string
          } | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          model_provider: string
          model_name: string
          system_prompt: string | null
          is_document_chat: boolean
          document_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          model_provider?: string
          model_name?: string
          system_prompt?: string | null
          is_document_chat?: boolean
          document_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          model_provider?: string
          model_name?: string
          system_prompt?: string | null
          is_document_chat?: boolean
          document_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          provider: string | null
          model: string | null
          tokens_used: number
          embedding: number[] | null
          document_context: any | null
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          provider?: string | null
          model?: string | null
          tokens_used?: number
          embedding?: number[] | null
          document_context?: any | null
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          provider?: string | null
          model?: string | null
          tokens_used?: number
          embedding?: number[] | null
          document_context?: any | null
          metadata?: any
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}