-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ENUM types
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE public.model_provider AS ENUM ('openai', 'anthropic', 'google', 'deepseek');

-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role public.user_role DEFAULT 'user'::public.user_role,
  preferred_model_provider public.model_provider DEFAULT 'openai'::public.model_provider,
  preferred_model_name TEXT DEFAULT 'gpt-4o-mini',
  preferred_language TEXT DEFAULT 'en',
  base_theme TEXT DEFAULT 'system',
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_cost_usd NUMERIC(10, 6) DEFAULT 0,
  daily_message_limit INTEGER DEFAULT 100,
  daily_token_limit BIGINT DEFAULT 100000,
  daily_cost_limit_usd NUMERIC(10, 2) DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  color_theme TEXT DEFAULT 'default',
  font_family TEXT DEFAULT 'sans',
  CONSTRAINT user_profiles_email_key UNIQUE (email),
  CONSTRAINT check_base_theme CHECK (base_theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  CONSTRAINT user_profiles_color_theme_check CHECK (color_theme = ANY (ARRAY['default'::text, 'ocean'::text, 'forest'::text, 'sunset'::text, 'lavender'::text, 'rose'::text])),
  CONSTRAINT user_profiles_font_family_check CHECK (font_family = ANY (ARRAY['sans'::text, 'serif'::text, 'mono'::text, 'playfair'::text, 'poppins'::text, 'crimson'::text]))
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles USING btree (role);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  model_provider TEXT NOT NULL DEFAULT 'openai',
  model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  is_document_chat BOOLEAN DEFAULT FALSE,
  document_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table with processing status
CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (
    (mime_type = 'application/pdf' AND file_size <= 31457280) OR -- 30MB for PDFs
    (mime_type LIKE 'image/%' AND file_size <= 10485760) -- 10MB for images
  ),
  processing_status TEXT DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  extracted_text TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for document_id after files table is created
ALTER TABLE public.conversations 
ADD CONSTRAINT fk_conversations_document_id 
FOREIGN KEY (document_id) REFERENCES files(id) ON DELETE SET NULL;

-- Messages table with enhanced document context
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  embedding vector(1536),
  document_context JSONB, -- Referenced document chunks
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks for RAG
CREATE TABLE public.document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}', -- page number, section, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated images table
CREATE TABLE public.generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'stable-diffusion',
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking for cost-optimized models
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL CHECK (
    resource_type IN ('tokens', 'images', 'searches', 'storage', 'document_processing')
  ),
  amount INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_embedding_hnsw ON messages USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_conversation_id ON files(conversation_id);
CREATE INDEX idx_usage_logs_user_id_date ON usage_logs(user_id, created_at);

-- Document RAG indexes
CREATE INDEX idx_document_chunks_file_id ON document_chunks(file_id);
CREATE INDEX idx_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_conversations_document_chat ON conversations(is_document_chat, user_id);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();