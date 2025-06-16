# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OrionChat is an MIT-licensed, open-source AI chat application built with Next.js 15 and Supabase. It supports multiple cost-optimized LLM providers (OpenAI, Anthropic, Google AI, DeepSeek), streaming responses, real-time conversations, file attachments, and document processing.

## Architecture

This is a **pnpm monorepo** with the following structure:

- `apps/web/` - Next.js 15 application (App Router)
- `packages/shared-types/` - TypeScript definitions shared across packages
- `packages/llm-adapters/` - Multi-provider LLM integration layer
- `supabase/` - Database migrations and configurations

### Key Components

**Frontend (apps/web/src/components/chat/)**:
- `ChatWindow.tsx` - Main chat interface with streaming message handling
- `ChatInput.tsx` - Message input with model selector and file upload
- `Sidebar.tsx` - Conversation list with CRUD operations
- `MessageBubble.tsx` - Individual message display
- `WelcomeScreen.tsx` - Initial screen with quick-start prompts

**Backend (apps/web/src/app/api/)**:
- `chat/stream/route.ts` - Server-Sent Events streaming for AI responses
- `conversations/route.ts` - Conversation CRUD operations

**Database**: PostgreSQL with pgvector extension for embeddings, managed through Supabase

## Development Commands

### Root Level (Monorepo)
```bash
# Start development server
pnpm dev

# Build all packages and apps
pnpm build

# Run linting across all workspaces
pnpm lint

# Type checking across all workspaces
pnpm typecheck

# Run tests across all workspaces
pnpm test
```

### Web App (apps/web/)
```bash
# Development server (runs on port 3000, or 3001 if 3000 is occupied)
cd apps/web && npm run dev

# Production build
cd apps/web && npm run build

# Start production server
cd apps/web && npm run start

# Lint Next.js app
cd apps/web && npm run lint
```

### Packages
```bash
# Build shared types package
cd packages/shared-types && npm run build

# Build LLM adapters package
cd packages/llm-adapters && npm run build
```

### Supabase Local Development
```bash
# Start local Supabase (required for development)
supabase start

# Stop local Supabase
supabase stop

# Reset local database
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > apps/web/src/lib/types/database.ts
```

## Critical Architecture Patterns

### Streaming Implementation
The chat uses Server-Sent Events for real-time AI responses:
- Client: `ChatWindow.tsx` handles ReadableStream with chunked parsing
- Server: `api/chat/stream/route.ts` implements SSE with LLMRouter
- Database operations are made async to prevent blocking the stream

### State Management
- React Context (`ChatProvider`) for global chat state
- Local component state for UI interactions
- Supabase Realtime for live updates across clients
- Optimistic updates for better UX

### Authentication & Security
- Supabase Auth with Row Level Security (RLS)
- All API routes require authentication
- File uploads validated by size and type
- Rate limiting implemented in middleware

### Database Schema
Key tables:
- `conversations` - Chat conversations with model configuration and settings
- `messages` - Individual messages with embeddings, attachments, and metadata
- `files` - File attachments with multi-provider upload support (stores `gemini_file_uri`, `anthropic_file_id`, `openai_file_id`)
- `user_profiles` - User preferences and settings

## Important Development Notes

### File Structure Conventions
- All React components use TypeScript and "use client" directive
- API routes follow Next.js 15 App Router conventions
- Shared types are centralized in `packages/shared-types/src/`
- Database types are auto-generated in `apps/web/src/lib/types/database.ts`

### Streaming Chat Implementation
When working on chat functionality:
1. Client-side streaming uses `ReadableStream` with SSE parsing
2. Server-side uses `LLMRouter` from `@orion-chat/llm-adapters`
3. Database message saving happens asynchronously to avoid blocking streams
4. State updates are atomic to prevent UI flickering

### Performance Optimizations Applied
- Database operations made non-blocking during streaming
- Optimized chunk processing with buffer management
- Client-side message IDs generated for immediate display
- Reduced database query overhead in conversation validation

### LLM Provider Integration
The `@orion-chat/llm-adapters` package provides unified interface for:
- OpenAI (gpt-4o-mini for cost optimization) - **Supports PDF uploads via Files API**
- Anthropic (Claude 3.5 Haiku) - **Supports PDF uploads with base64 encoding**
- Google AI (Gemini models) - **Supports PDF uploads via Files API**
- DeepSeek (reasoning models)

### Environment Variables Required
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
DEEPSEEK_API_KEY=
```

## Common Development Tasks

### Adding New Message Types
1. Update `Message` type in `packages/shared-types/src/database.ts`
2. Add UI handling in `MessageBubble.tsx`
3. Update streaming logic in `api/chat/stream/route.ts`

### Adding New LLM Providers
1. Create provider adapter in `packages/llm-adapters/src/providers/`
2. Update `LLMRouter` to include new provider
3. Add provider configuration to `ModelSelector.tsx`
4. For PDF support: Add file upload logic to `api/files/upload/route.ts`

### PDF File Support Implementation
The application supports PDF uploads to multiple LLM providers:

**File Upload Process (`api/files/upload/route.ts`)**:
1. PDFs are uploaded simultaneously to all supported provider APIs:
   - OpenAI: Uses Files API with `purpose: "user_data"`
   - Anthropic: Uses Files API with beta headers
   - Gemini: Uses FileManager with display name
2. Provider-specific file IDs are stored in the `files` table
3. Files are also stored in Supabase storage for fallback access

**Chat Integration (`api/chat/stream/route.ts`)**:
- PDF attachments are processed based on provider:
  - OpenAI: Uses `file_id` reference in message content
  - Anthropic: Downloads from storage, converts to base64
  - Gemini: Uses `file_uri` reference directly
- Multimodal content is structured per provider's API requirements

**Provider Implementations**:
- **OpenAI** (`openai-mini.ts`): Direct file_id reference with `type: 'file'`
- **Anthropic** (`claude-haiku.ts`): Base64 conversion with `type: 'document'`
- **Gemini**: File URI reference (existing implementation)

### Database Schema Changes
1. Create migration in `supabase/migrations/`
2. Run `supabase db reset` to apply locally
3. Regenerate types: `supabase gen types typescript --local`
4. **Important**: If types don't match actual schema, manually extend types in component files

### Testing Streaming
- Use browser DevTools Network tab to monitor SSE connections
- Check `data:` events for proper JSON formatting
- Verify database operations don't block streaming responses

### Testing PDF Support
1. Upload PDF files through the chat interface
2. Verify successful upload to all provider APIs in console logs
3. Test chat functionality with each supported model (GPT-4o-mini, Claude 3.5 Haiku, Gemini)
4. Check file processing status in Supabase `files` table

## Troubleshooting

### Common Issues
- **Build failures**: Ensure all packages are built (`pnpm --recursive build`)
- **Import errors**: Check workspace dependencies in package.json files
- **Supabase connection**: Verify `supabase start` is running locally
- **Streaming issues**: Check network tab for SSE connection status
- **Type errors**: Regenerate database types after schema changes
- **PDF upload failures**: Check API keys for all providers (OpenAI, Anthropic, Google AI)
- **TypeScript errors**: If auto-generated types don't match schema, manually extend types with intersection (&) operator

### Performance Issues
- Monitor streaming response times in browser DevTools
- Check database query performance in Supabase Studio
- Verify async database operations aren't blocking streams

### PDF-Specific Troubleshooting
- **File size limits**: OpenAI (32MB), Anthropic (varies), Gemini (varies)
- **Model compatibility**: Ensure using PDF-compatible models (GPT-4o-mini, Claude 3.5 Haiku, Gemini)
- **API errors**: Check provider-specific error messages in console
- **Base64 conversion issues**: Monitor Supabase storage access for Anthropic implementation