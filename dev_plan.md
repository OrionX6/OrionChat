OrionChat Development Plan

Executive Overview

This document outlines the complete engineering plan for OrionChat - an MIT-licensed, open-source chat application built on Next.js + Supabase. OrionChat will support cost-effective LLM providers (GPT-4o mini, Claude Haiku, Gemini Flash 2.0, and DeepSeek R1), intelligent PDF processing for document conversations, Stable Diffusion image generation, and free web search capabilities. The application focuses on web-first deployment with GitHub hosting.

Tech Stack

Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
Backend: Next.js API Routes, Supabase (Auth, Database, Storage, Realtime)
Database: PostgreSQL with pgvector extension
LLM Providers: GPT-4o mini, Claude Haiku, Gemini Flash 2.0, DeepSeek R1 (cost-optimized)
Document Processing: PDF text extraction with vector embeddings for RAG
Image Generation: Stable Diffusion via Replicate
Search: Brave Search API (free tier), DuckDuckGo fallback
File Limits: 30MB PDFs, 10MB images
Deployment: GitHub Pages, Vercel, or self-hosted
DevOps: GitHub Actions, Docker, pnpm workspaces
Phase 1: Project Foundation & Tooling

1.1 Repository Setup

Estimated Time: 2-3 hours

[ ] Create Next.js application
npx create-next-app@latest orion-chat --typescript --tailwind --eslint --app --src-dir
[ ] Initialize pnpm workspace
// package.json{ "name": "orion-chat-monorepo", "private": true, "workspaces": ["apps/*", "packages/*"]}
[ ] Create directory structure:
orion-chat/├── apps/│ └── web/ # Main Next.js app├── packages/│ ├── llm-adapters/ # Cost-optimized LLM providers│ ├── document-processor/ # PDF RAG pipeline│ ├── search-providers/ # Search API adapters│ └── shared-types/ # TypeScript definitions├── docs/ # Documentation site└── docker/ # Docker configurations
[ ] Add MIT License and Code of Conduct
[ ] Initialize git with proper .gitignore
1.2 Development Environment

Estimated Time: 3-4 hours

[ ] Configure package manager (pnpm)
[ ] Setup ESLint + Prettier configuration
// .eslintrc.json{ "extends": ["next/core-web-vitals", "@typescript-eslint/recommended"], "rules": { "@typescript-eslint/no-unused-vars": "error", "prefer-const": "error" }}
[ ] Configure Husky for pre-commit hooks
pnpm add -D husky lint-stagednpx husky init
[ ] Setup Turbo for monorepo task running (optional)
[ ] Configure VS Code workspace settings
[ ] Add development scripts to package.json
1.3 CI/CD Pipeline

Estimated Time: 4-5 hours

[ ] Create GitHub Actions workflow

# .github/workflows/ci.ymlname: CI/CD Pipelineon: push: branches: [main, develop] pull_request: branches: [main]jobs: test: runs-on: ubuntu-latest steps: - uses: actions/checkout@v4 - uses: pnpm/action-setup@v3 with: version: 8 - uses: actions/setup-node@v4 with: node-version: '18' cache: 'pnpm' - run: pnpm install --frozen-lockfile - run: pnpm lint - run: pnpm typecheck - run: pnpm test - run: pnpm build docker-build: if: github.ref == 'refs/heads/main' needs: test runs-on: ubuntu-latest steps: - uses: actions/checkout@v4 - name: Build and push Docker image run: | docker build -t ghcr.io/${{ github.repository }}:latest .          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.repository_owner }} --password-stdin          docker push ghcr.io/${{ github.repository }}:latest

[ ] Setup branch protection rules
[ ] Configure semantic release (optional)
[ ] Add Docker multi-stage build configuration
Phase 2: Supabase Infrastructure

2.1 Supabase Project Setup

Estimated Time: 3-4 hours

[ ] Create Supabase project
[ ] Install Supabase CLI and SDK
pnpm add @supabase/supabase-jspnpm add -D supabase
[ ] Initialize local development
supabase initsupabase start
[ ] Configure environment variables

# .env.localNEXT_PUBLIC_SUPABASE_URL=your_supabase_urlNEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_keySUPABASE_SERVICE_ROLE_KEY=your_service_role_key

2.2 Database Schema

Estimated Time: 4-5 hours

[ ] Enable pgvector extension

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;
[ ] Create core tables

-- User profiles table
CREATE TABLE public.user_profiles (
id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
display_name TEXT,
avatar_url TEXT,
bio TEXT,
preferences JSONB DEFAULT '{
"default_model": "gpt-4o-mini",
"theme": "system",
"language": "en"
}',
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE public.conversations (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
title TEXT NOT NULL DEFAULT 'New Conversation',
model_provider TEXT NOT NULL DEFAULT 'openai',
model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
system_prompt TEXT,
is_document_chat BOOLEAN DEFAULT FALSE,
document_id UUID REFERENCES files(id) ON DELETE SET NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Generated images table (simplified)
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
[ ] Create indexes for performance

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
2.3 Row Level Security (RLS)

Estimated Time: 2-3 hours

[ ] Enable RLS on all tables
[ ] Create security policies
-- Enable RLSALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;ALTER TABLE messages ENABLE ROW LEVEL SECURITY;ALTER TABLE files ENABLE ROW LEVEL SECURITY;ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;-- User profiles policiesCREATE POLICY "Users can view own profile" ON user_profiles FOR ALL USING (auth.uid() = id);-- Conversations policiesCREATE POLICY "Users can manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);-- Messages policiesCREATE POLICY "Users can manage messages in own conversations" ON messages FOR ALL USING ( conversation_id IN ( SELECT id FROM conversations WHERE user_id = auth.uid() ) );-- Files policiesCREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = user_id);-- Generated images policiesCREATE POLICY "Users can manage own generated images" ON generated_images FOR ALL USING (auth.uid() = user_id);-- Usage logs policiesCREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
2.4 Storage Configuration

Estimated Time: 2-3 hours

[ ] Create storage buckets

-- Create buckets with appropriate size limits
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES
('attachments', 'attachments', false, 31457280), -- 30MB for PDFs
('images', 'images', false, 10485760), -- 10MB for images
('generated-images', 'generated-images', false, 10485760), -- 10MB for generated images
('avatars', 'avatars', true, 2097152); -- 2MB for avatars
[ ] Configure storage policies

-- Attachments bucket policies
CREATE POLICY "Users can upload own attachments" ON storage.objects
FOR INSERT WITH CHECK (
bucket_id = 'attachments' AND
auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own attachments" ON storage.objects
FOR SELECT USING (
bucket_id = 'attachments' AND
auth.uid()::text = (storage.foldername(name))[1]
);
[ ] Enable TUS protocol for resumable uploads

[ ] Configure file size limits (100MB default)

2.5 Realtime Configuration

Estimated Time: 1-2 hours

[ ] Enable Realtime on tables
ALTER publication supabase_realtime ADD TABLE messages;ALTER publication supabase_realtime ADD TABLE files;ALTER publication supabase_realtime ADD TABLE generated_images;
[ ] Configure Realtime channels for live updates
[ ] Test real-time message streaming
Phase 3: LLM Integration Layer

3.1 Cost-Optimized Provider Adapters

Estimated Time: 6-8 hours

[ ] Create packages/llm-adapters package with focus on cost efficiency

[ ] Define unified interface for budget models

// packages/llm-adapters/src/types.ts
export interface ChatMessage {
role: 'user' | 'assistant' | 'system';
content: string;
metadata?: Record<string, any>;
}

export interface StreamChunk {
content: string;
done: boolean;
usage?: TokenUsage;
}

export interface CostOptimizedProvider {
name: string;
models: string[];
costPerToken: { input: number; output: number }; // in cents per 1k tokens
maxTokens: number;
stream(messages: ChatMessage[], options: StreamOptions): AsyncIterable<StreamChunk>;
embed(text: string): Promise<number[]>;
supportsFunctions: boolean;
}
[ ] Implement GPT-4o mini adapter

// packages/llm-adapters/src/providers/openai-mini.ts
import OpenAI from 'openai';

export class OpenAIMiniProvider implements CostOptimizedProvider {
name = 'openai';
models = ['gpt-4o-mini'];
costPerToken = { input: 0.015, output: 0.06 }; // per 1k tokens
maxTokens = 128000;
supportsFunctions = true;

private client: OpenAI;

constructor(apiKey: string) {
this.client = new OpenAI({ apiKey });
}

async \*stream(messages: ChatMessage[], options: StreamOptions) {
const stream = await this.client.chat.completions.create({
model: 'gpt-4o-mini',
messages: messages.map(msg => ({
role: msg.role,
content: msg.content
})),
stream: true,
max_tokens: Math.min(options.maxTokens || 4096, this.maxTokens),
functions: options.functions
});

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const usage = chunk.usage;
      yield {
        content,
        done: chunk.choices[0]?.finish_reason === 'stop',
        usage
      };
    }

}
}
[ ] Implement Claude Haiku adapter

// packages/llm-adapters/src/providers/claude-haiku.ts
export class ClaudeHaikuProvider implements CostOptimizedProvider {
name = 'anthropic';
models = ['claude-3-haiku-20240307'];
costPerToken = { input: 0.025, output: 0.125 }; // per 1k tokens
maxTokens = 200000;
supportsFunctions = true;

// Implementation with Anthropic SDK...
}
[ ] Implement Gemini Flash 2.0 adapter

[ ] Implement DeepSeek R1 adapter with enhanced reasoning capabilities

3.2 Document Processing & RAG Pipeline

Estimated Time: 8-10 hours

[ ] Create packages/document-processor for PDF RAG

[ ] Implement PDF text extraction and chunking

// packages/document-processor/src/pdf-processor.ts
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export class PDFProcessor {
private textSplitter = new RecursiveCharacterTextSplitter({
chunkSize: 1000,
chunkOverlap: 200,
separators: ['\n\n', '\n', '.', '!', '?', ' ', '']
});

async processDocument(filePath: string, fileId: string) {
const loader = new PDFLoader(filePath);
const documents = await loader.load();

    const chunks = await this.textSplitter.splitDocuments(documents);

    const processedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.embedText(chunk.pageContent);

      processedChunks.push({
        file_id: fileId,
        chunk_index: i,
        content: chunk.pageContent,
        embedding,
        metadata: {
          page: chunk.metadata.loc?.pageNumber || 0,
          source: chunk.metadata.source
        }
      });
    }

    return processedChunks;

}

async embedText(text: string): Promise<number[]> {
// Use OpenAI embeddings for consistency
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.embeddings.create({
model: 'text-embedding-3-small',
input: text
});
return response.data[0].embedding;
}
}
[ ] Implement semantic search for document chunks

// packages/document-processor/src/rag-retriever.ts
export class RAGRetriever {
async searchDocumentChunks(
query: string,
fileId: string,
limit = 5,
threshold = 0.7
) {
const queryEmbedding = await this.embedText(query);

    const { data } = await supabase.rpc('match_document_chunks', {
      file_id: fileId,
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

    return data;

}

async buildContextForQuery(query: string, fileId: string): Promise<string> {
const relevantChunks = await this.searchDocumentChunks(query, fileId);

    if (relevantChunks.length === 0) {
      return "No relevant information found in the document.";
    }

    const context = relevantChunks
      .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
      .join('\n\n');

    return `Here's the relevant information from the document:\n\n${context}`;

}
}
[ ] Create SQL function for vector similarity search

-- Function to match document chunks by similarity
CREATE OR REPLACE FUNCTION match_document_chunks(
file_id UUID,
query_embedding vector(1536),
match_threshold float,
match_count int
)
RETURNS TABLE (
id UUID,
content TEXT,
similarity float,
metadata JSONB
)
LANGUAGE plpgsql
AS $
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    (document_chunks.embedding <#> query_embedding) * -1 AS similarity,
    document_chunks.metadata
  FROM document_chunks
  WHERE document_chunks.file_id = match_document_chunks.file_id
    AND (document_chunks.embedding <#> query_embedding) * -1 > match_threshold
  ORDER BY document_chunks.embedding <#> query_embedding
  LIMIT match_count;
END;
$;
3.3 Function Calling & Tool Integration

Estimated Time: 6-8 hours

[ ] Define tools for document chat and web search

// packages/llm-adapters/src/tools.ts
export const availableTools = {
search_document: {
name: 'search_document',
description: 'Search through the uploaded document for relevant information',
parameters: {
type: 'object',
properties: {
query: {
type: 'string',
description: 'Search query to find relevant information in the document'
}
},
required: ['query']
}
},
web_search: {
name: 'web_search',
description: 'Search the web for current information',
parameters: {
type: 'object',
properties: {
query: { type: 'string', description: 'Search query' }
},
required: ['query']
}
},
generate_image: {
name: 'generate_image',
description: 'Generate an image using Stable Diffusion',
parameters: {
type: 'object',
properties: {
prompt: { type: 'string', description: 'Image generation prompt' }
},
required: ['prompt']
}
},
summarize_document: {
name: 'summarize_document',
description: 'Provide a summary of the uploaded document',
parameters: {
type: 'object',
properties: {
focus: {
type: 'string',
description: 'Optional: specific aspect to focus on in the summary'
}
},
required: []
}
}
};
[ ] Implement tool execution router

[ ] Add context-aware tool selection based on conversation type

[ ] Build context retrieval system

// apps/web/src/lib/embeddings.ts
export async function embedText(text: string): Promise<number[]> {
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.embeddings.create({
model: 'text-embedding-3-small',
input: text
});

return response.data[0].embedding;
}

export async function searchSimilarMessages(
conversationId: string,
query: string,
limit = 5
) {
const embedding = await embedText(query);
const { data } = await supabase.rpc('match_messages', {
conversation_id: conversationId,
query_embedding: embedding,
match_threshold: 0.7,
match_count: limit
});

return data;
}
Phase 4: API Routes Implementation

4.1 Chat Streaming API

Estimated Time: 6-8 hours

[ ] Create /api/chat/stream endpoint

// apps/web/src/app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { LLMRouter } from '@/lib/llm-router';

export async function POST(request: NextRequest) {
try {
const supabase = createServerClient(/_ config _/);
const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, conversationId, provider, model } = await request.json();

    const router = new LLMRouter();
    const stream = await router.stream({
      messages,
      provider,
      model,
      userId: user.id,
      conversationId
    });

    return new Response(
      new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify(chunk)}\n\n`
              )
            );
          }
          controller.close();
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    );

} catch (error) {
return new Response(
JSON.stringify({ error: 'Internal server error' }),
{ status: 500 }
);
}
}
[ ] Implement message persistence

[ ] Add token usage tracking

[ ] Handle streaming errors gracefully

4.2 File Upload API

Estimated Time: 5-6 hours

[ ] Create /api/upload endpoint with TUS support

[ ] Implement file validation and processing

// apps/web/src/app/api/upload/route.ts
export async function POST(request: NextRequest) {
const supabase = createServerClient(/_ config _/);
const { data: { user } } = await supabase.auth.getUser();

if (!user) return new Response('Unauthorized', { status: 401 });

const formData = await request.formData();
const file = formData.get('file') as File;
const conversationId = formData.get('conversationId') as string;

// Validate file
if (file.size > 100 _ 1024 _ 1024) { // 100MB limit
return Response.json({ error: 'File too large' }, { status: 400 });
}

// Upload to storage
const fileName = `${user.id}/${Date.now()}-${file.name}`;
const { data, error } = await supabase.storage
.from('attachments')
.upload(fileName, file);

if (error) {
return Response.json({ error: 'Upload failed' }, { status: 500 });
}

// Save metadata
await supabase.from('files').insert({
user_id: user.id,
conversation_id: conversationId,
storage_path: data.path,
original_name: file.name,
mime_type: file.type,
file_size: file.size
});

// Queue for processing if PDF
if (file.type === 'application/pdf') {
await queuePDFProcessing(data.path, user.id);
}

return Response.json({ success: true, path: data.path });
}
[ ] Add resumable upload support with TUS

[ ] Implement file preview generation

4.3 Image Generation API

Estimated Time: 4-5 hours

[ ] Create /api/image-gen endpoint

// apps/web/src/app/api/image-gen/route.ts
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
const supabase = createServerClient(/_ config _/);
const { data: { user } } = await supabase.auth.getUser();

if (!user) return new Response('Unauthorized', { status: 401 });

const { prompt, style = 'realistic', conversationId } = await request.json();

// Check daily quota
const todayUsage = await checkImageGenerationQuota(user.id);
if (todayUsage >= 10) {
return Response.json({ error: 'Daily quota exceeded' }, { status: 429 });
}

const replicate = new Replicate({
auth: process.env.REPLICATE_API_TOKEN
});

const output = await replicate.run(
"stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
{
input: {
prompt: `${prompt}, ${style} style`,
width: 1024,
height: 1024,
num_inference_steps: 20,
guidance_scale: 7.5
}
}
);

// Save generated image
const imagePath = await saveGeneratedImage(output[0], user.id);

await supabase.from('generated_images').insert({
user_id: user.id,
conversation_id: conversationId,
prompt,
storage_path: imagePath,
model: 'stable-diffusion'
});

return Response.json({
success: true,
imageUrl: imagePath,
prompt
});
}
[ ] Add image quota management

[ ] Support multiple image generation backends

4.4 Search API

Estimated Time: 3-4 hours

[ ] Create /api/search endpoint with Brave Search

// apps/web/src/app/api/search/route.ts
export async function GET(request: NextRequest) {
const { searchParams } = new URL(request.url);
const query = searchParams.get('q');

if (!query) {
return Response.json({ error: 'Query required' }, { status: 400 });
}

try {
const response = await fetch(
`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
{
headers: {
'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!
}
}
);

    const data = await response.json();
    const results = data.web?.results?.slice(0, 5).map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.description
    })) || [];

    return Response.json({ results });

} catch (error) {
// Fallback to DuckDuckGo if Brave fails
return await fallbackSearch(query);
}
}
[ ] Implement DuckDuckGo fallback

[ ] Add search result caching

Phase 5: Frontend Implementation

5.1 Core UI Components

Estimated Time: 12-15 hours

[ ] Setup shadcn/ui components

npx shadcn-ui@latest init
npx shadcn-ui@latest add button input textarea card avatar dropdown-menu
[ ] Create ChatWindow component

// apps/web/src/components/chat/ChatWindow.tsx
'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';

export function ChatWindow({ conversationId }: { conversationId: string }) {
const { messages, sendMessage, isLoading } = useChat(conversationId);

return (
<div className="flex flex-col h-full">
<div className="flex-1 overflow-y-auto p-4 space-y-4">
{messages.map((message) => (
<MessageBubble key={message.id} message={message} />
))}
{isLoading && <TypingIndicator />}
</div>
<ChatInput onSend={sendMessage} disabled={isLoading} />
</div>
);
}
[ ] Build MessageBubble with markdown support

[ ] Create ChatInput with file upload

[ ] Implement TypingIndicator animation

[ ] Add ModelSelector dropdown

[ ] Build AttachmentPreview component

5.2 State Management

Estimated Time: 6-8 hours

[ ] Create chat context provider

// apps/web/src/contexts/ChatContext.tsx
'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChatState {
conversations: Conversation[];
currentConversation: Conversation | null;
messages: Message[];
isLoading: boolean;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
const [state, dispatch] = useReducer(chatReducer, initialState);
const supabase = createClient();

useEffect(() => {
// Subscribe to realtime updates
const channel = supabase
.channel('chat-updates')
.on('postgres_changes',
{ event: 'INSERT', schema: 'public', table: 'messages' },
(payload) => {
dispatch({ type: 'MESSAGE_RECEIVED', payload: payload.new });
}
)
.subscribe();

    return () => supabase.removeChannel(channel);

}, []);

return (
<ChatContext.Provider value={{ state, dispatch }}>
{children}
</ChatContext.Provider>
);
}
[ ] Implement chat reducer for state management

[ ] Add optimistic updates for better UX

[ ] Create custom hooks (useChat, useConversations)

5.3 Real-time Features

Estimated Time: 4-5 hours

[ ] Implement Supabase Realtime integration
[ ] Add typing indicators
[ ] Stream message updates
[ ] Handle connection states
5.4 File Upload UI

Estimated Time: 5-6 hours

[ ] Create drag-and-drop upload area
[ ] Add upload progress indicators
[ ] Implement file preview components
[ ] Add resumable upload with TUS client
Phase 6: Advanced Features

6.1 PDF Text Extraction

Estimated Time: 4-5 hours

[ ] Create Edge Function for PDF processing
[ ] Extract text using pdf-parse or similar
[ ] Store extracted text for retrieval
[ ] Index content for semantic search
6.2 Image Generation UI

Estimated Time: 3-4 hours

[ ] Create image generation panel
[ ] Add style selection options
[ ] Display generation progress
[ ] Gallery view for generated images
6.3 Search Integration

Estimated Time: 3-4 hours

[ ] Add search toggle to chat input
[ ] Display search results in conversation
[ ] Cache search results
[ ] Handle search API rate limits
Phase 7: Security & Performance

7.1 Security Implementation

Estimated Time: 6-8 hours

[ ] Implement rate limiting middleware

// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
redis: Redis.fromEnv(),
limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
});

export async function middleware(request: NextRequest) {
if (request.nextUrl.pathname.startsWith('/api/')) {
const ip = request.ip ?? '127.0.0.1';
const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

}

return NextResponse.next();
}
[ ] Add API key validation and rotation

[ ] Implement request sanitization

[ ] Add CORS configuration

[ ] Setup environment variable validation

// apps/web/src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
SUPABASE_SERVICE_ROLE_KEY: z.string(),
OPENAI_API_KEY: z.string(),
ANTHROPIC_API_KEY: z.string(),
GOOGLE_AI_API_KEY: z.string(),
DEEPSEEK_API_KEY: z.string(),
REPLICATE_API_TOKEN: z.string(),
BRAVE_SEARCH_API_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
[ ] Add input validation with Zod

[ ] Implement content security policies

[ ] Add SQL injection prevention measures

7.2 Cost Control & Monitoring

Estimated Time: 5-6 hours

[ ] Create usage tracking system

// apps/web/src/lib/usage-tracker.ts
export class UsageTracker {
async trackTokenUsage(userId: string, provider: string, tokens: number) {
const cost = this.calculateCost(provider, tokens);

    await supabase.from('usage_logs').insert({
      user_id: userId,
      resource_type: 'tokens',
      amount: tokens,
      cost_cents: cost,
      metadata: { provider }
    });

}

async checkDailyQuota(userId: string, resourceType: string): Promise<number> {
const today = new Date().toISOString().split('T')[0];
const { data } = await supabase
.from('usage_logs')
.select('amount')
.eq('user_id', userId)
.eq('resource_type', resourceType)
.gte('created_at', `${today}T00:00:00`)
.lt('created_at', `${today}T23:59:59`);

    return data?.reduce((sum, log) => sum + log.amount, 0) || 0;

}
}
[ ] Implement daily/monthly usage limits

[ ] Add cost estimation for users

[ ] Create usage dashboard

[ ] Setup alerts for high usage patterns

7.3 Performance Optimization

Estimated Time: 6-7 hours

[ ] Add Redis caching for API responses
[ ] Implement database query optimization
[ ] Add CDN for static assets
[ ] Optimize bundle size with code splitting
[ ] Add service worker for offline functionality
[ ] Implement lazy loading for components
[ ] Add database connection pooling
[ ] Create performance monitoring dashboard
Phase 8: Testing Strategy

8.1 Unit Testing

Estimated Time: 8-10 hours

[ ] Setup testing framework (Vitest)

pnpm add -D vitest @testing-library/react @testing-library/jest-dom
[ ] Create test utilities

// apps/web/src/test/utils.tsx
import { render } from '@testing-library/react';
import { ChatProvider } from '@/contexts/ChatContext';

export function renderWithProviders(ui: React.ReactElement) {
return render(
<ChatProvider>
{ui}
</ChatProvider>
);
}
[ ] Write tests for LLM adapters

[ ] Test API route handlers

[ ] Test utility functions

[ ] Add component testing

[ ] Test error handling scenarios

8.2 Integration Testing

Estimated Time: 6-8 hours

[ ] Setup Supertest for API testing
[ ] Test database operations
[ ] Test file upload pipeline
[ ] Test real-time functionality
[ ] Test authentication flows
8.3 End-to-End Testing

Estimated Time: 8-10 hours

[ ] Setup Cypress or Playwright

// cypress/e2e/chat-flow.cy.ts
describe('Chat Flow', () => {
beforeEach(() => {
cy.login('test@example.com', 'password');
});

it('should create new conversation and send message', () => {
cy.visit('/');
cy.get('[data-testid="new-chat"]').click();
cy.get('[data-testid="chat-input"]').type('Hello, world!');
cy.get('[data-testid="send-button"]').click();
cy.get('[data-testid="message"]').should('contain', 'Hello, world!');
});

it('should upload file and process it', () => {
cy.visit('/chat/123');
cy.get('[data-testid="file-upload"]').selectFile('test.pdf');
cy.get('[data-testid="file-status"]').should('contain', 'Processing');
cy.get('[data-testid="file-status"]').should('contain', 'Completed');
});
});
[ ] Test complete user journeys

[ ] Test cross-browser compatibility

[ ] Test mobile responsiveness

[ ] Test error scenarios

8.4 Load Testing

Estimated Time: 4-5 hours

[ ] Setup k6 for load testing

// tests/load/chat-stream.js
import http from 'k6/http';
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
stages: [
{ duration: '2m', target: 10 },
{ duration: '5m', target: 50 },
{ duration: '2m', target: 0 },
],
};

export default function() {
const response = http.post('http://localhost:3000/api/chat/stream', {
messages: [{ role: 'user', content: 'Test message' }]
});

check(response, {
'status is 200': (r) => r.status === 200,
'response time < 5000ms': (r) => r.timings.duration < 5000,
});
}
[ ] Test concurrent chat sessions

[ ] Test file upload under load

[ ] Test database performance

[ ] Identify bottlenecks and optimize

Phase 9: Documentation & DevOps

9.1 Documentation

Estimated Time: 6-8 hours

[ ] Create comprehensive README.md
[ ] Write API documentation
[ ] Create deployment guides
[ ] Add code comments and JSDoc
[ ] Create user guides
[ ] Setup documentation site with Docusaurus
npx create-docusaurus@latest docs classic --typescript
9.2 Docker Configuration

Estimated Time: 4-5 hours

[ ] Create multi-stage Dockerfile

# Dockerfile

FROM node:18-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --production=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
[ ] Create docker-compose for development

# docker-compose.yml

version: '3.8'
services:
app:
build: .
ports: - "3000:3000"
environment: - NODE_ENV=production
depends_on: - redis - postgres

redis:
image: redis:7-alpine
ports: - "6379:6379"

postgres:
image: postgres:15
environment:
POSTGRES_DB: ai_chat
POSTGRES_USER: postgres
POSTGRES_PASSWORD: password
ports: - "5432:5432"
volumes: - postgres_data:/var/lib/postgresql/data

volumes:
postgres_data:
[ ] Add health checks and monitoring

[ ] Optimize image size

9.3 Deployment Configuration

Estimated Time: 5-6 hours

[ ] Create Vercel deployment config
[ ] Setup Railway/Fly.io deployment
[ ] Configure environment variables for production
[ ] Setup SSL certificates
[ ] Configure CDN and caching
[ ] Add monitoring and logging
Phase 10: Community & Maintenance

10.1 Open Source Setup

Estimated Time: 4-5 hours

[ ] Create CONTRIBUTING.md
[ ] Setup issue templates
[ ] Add pull request templates
[ ] Create CODE_OF_CONDUCT.md
[ ] Setup GitHub Discussions
[ ] Add "good first issue" labels
[ ] Create project roadmap
10.2 Maintenance Planning

Estimated Time: 3-4 hours

[ ] Setup automated dependency updates (Dependabot)
[ ] Create release process
[ ] Plan regular security audits
[ ] Setup error monitoring (Sentry)
[ ] Create backup and recovery procedures
Environment Variables

Create a .env.example file with all required variables:

# Supabase

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM Providers

OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key
DEEPSEEK_API_KEY=your_deepseek_key

# Image Generation

REPLICATE_API_TOKEN=your_replicate_token

# Search

BRAVE_SEARCH_API_KEY=your_brave_search_key

# Caching & Rate Limiting

UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Monitoring

SENTRY_DSN=your_sentry_dsn
Development Timeline

Total Estimated Time: 85-110 hours (10-14 weeks part-time)

Week 1-2: Foundation

Repository setup and tooling
Supabase configuration
Basic project structure
Week 3-4: Core Backend

LLM integrations
API routes implementation
Database schema completion
Week 5-7: Frontend Development

UI components
State management
Real-time features
Week 8-9: Advanced Features

File processing
Image generation
Search integration
Week 10-11: Security & Performance

Security implementation
Performance optimization
Cost controls
Week 12-13: Testing & Documentation

Comprehensive testing
Documentation
Deployment setup
Week 14: Launch Preparation

Final testing
Community setup
Production deployment
Success Metrics

[ ] Performance: <2s initial load, <500ms message response
[ ] Reliability: 99.9% uptime, graceful error handling
[ ] Security: Pass security audit, no data breaches
[ ] User Experience: Intuitive UI, real-time updates
[ ] Cost Efficiency: <$10/user/month operational costs
[ ] Community: 100+ GitHub stars, active contributors
Getting Started

Clone and Setup:

git clone https://github.com/OrionX6/OrionChat.git
cd OrionChat
pnpm install
Configure Environment:

cp .env.example .env.local

# Fill in your API keys

Start Development:

supabase start
pnpm dev
Run Tests:

pnpm test
pnpm test:e2e
