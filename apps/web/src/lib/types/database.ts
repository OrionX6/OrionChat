export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          role: string | null
          preferred_model_provider: string | null
          preferred_model_name: string | null
          preferred_language: string | null
          theme: string | null
          total_conversations: number | null
          total_messages: number | null
          total_tokens_used: number | null
          total_cost_usd: number | null
          daily_message_limit: number | null
          daily_token_limit: number | null
          daily_cost_limit_usd: number | null
          created_at: string
          updated_at: string
          last_active_at: string | null
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          role?: string | null
          preferred_model_provider?: string | null
          preferred_model_name?: string | null
          preferred_language?: string | null
          theme?: string | null
          total_conversations?: number | null
          total_messages?: number | null
          total_tokens_used?: number | null
          total_cost_usd?: number | null
          daily_message_limit?: number | null
          daily_token_limit?: number | null
          daily_cost_limit_usd?: number | null
          created_at?: string
          updated_at?: string
          last_active_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: string | null
          preferred_model_provider?: string | null
          preferred_model_name?: string | null
          preferred_language?: string | null
          theme?: string | null
          total_conversations?: number | null
          total_messages?: number | null
          total_tokens_used?: number | null
          total_cost_usd?: number | null
          daily_message_limit?: number | null
          daily_token_limit?: number | null
          daily_cost_limit_usd?: number | null
          created_at?: string
          updated_at?: string
          last_active_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          model_provider: string
          model_name: string
          temperature: number | null
          max_tokens: number | null
          system_prompt: string | null
          is_document_chat: boolean | null
          is_image_generation_enabled: boolean | null
          is_web_search_enabled: boolean | null
          message_count: number | null
          total_tokens_used: number | null
          total_cost_usd: number | null
          created_at: string
          updated_at: string
          last_message_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          model_provider?: string
          model_name?: string
          temperature?: number | null
          max_tokens?: number | null
          system_prompt?: string | null
          is_document_chat?: boolean | null
          is_image_generation_enabled?: boolean | null
          is_web_search_enabled?: boolean | null
          message_count?: number | null
          total_tokens_used?: number | null
          total_cost_usd?: number | null
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          model_provider?: string
          model_name?: string
          temperature?: number | null
          max_tokens?: number | null
          system_prompt?: string | null
          is_document_chat?: boolean | null
          is_image_generation_enabled?: boolean | null
          is_web_search_enabled?: boolean | null
          message_count?: number | null
          total_tokens_used?: number | null
          total_cost_usd?: number | null
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          provider: string | null
          model: string | null
          tokens_used: number | null
          cost_usd: number | null
          response_time_ms: number | null
          finish_reason: string | null
          tool_calls: any | null
          attachments: any | null
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          provider?: string | null
          model?: string | null
          tokens_used?: number | null
          cost_usd?: number | null
          response_time_ms?: number | null
          finish_reason?: string | null
          tool_calls?: any | null
          attachments?: any | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          provider?: string | null
          model?: string | null
          tokens_used?: number | null
          cost_usd?: number | null
          response_time_ms?: number | null
          finish_reason?: string | null
          tool_calls?: any | null
          attachments?: any | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
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