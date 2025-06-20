# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OrionChat is an MIT-licensed, open-source AI chat application built with Next.js 15 and Supabase. It supports multiple cost-optimized LLM providers (OpenAI, Anthropic, Google AI, DeepSeek), streaming responses, real-time conversations, file attachments, and document processing.

## Architecture

This is a **npm monorepo** with the following structure:

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
npm run dev

# Build all packages and apps
npm run build

# Run linting across all workspaces
npm run lint

# Type checking across all workspaces
npm run typecheck

# Run tests across all workspaces
npm test
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
- `user_profiles` - User preferences and settings with individual columns:
  - `preferred_model_name` - Default AI model (e.g., 'gpt-4o-mini')
  - `preferred_model_provider` - Default provider (e.g., 'openai')
  - `base_theme` - UI theme ('light', 'dark', 'system')
  - `color_theme` - Color scheme ('default', 'ocean', 'forest', etc.)
  - `font_family` - Typography ('sans', 'serif', 'mono', 'playfair', 'poppins', 'crimson')
  - `preferred_language` - Interface language
  - Usage tracking: `total_conversations`, `total_messages`, `total_tokens_used`, `total_cost_usd`
  - Rate limits: `daily_message_limit`, `daily_token_limit`, `daily_cost_limit_usd`

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
5. **Real-time formatting**: StreamingMessageBubble now uses identical formatting to MessageBubble for consistent rendering during streaming

### Performance Optimizations Applied
- Database operations made non-blocking during streaming
- Optimized chunk processing with buffer management
- Client-side message IDs generated for immediate display
- Reduced database query overhead in conversation validation
- **Consistent formatting**: Eliminated visual jumps between streaming and completed messages

### Font System Architecture
The application uses a sophisticated font system with Next.js optimization and cross-device persistence:

#### **Available Fonts:**
- **Geist Sans**: Modern, clean default font
- **Serif**: Traditional serif fallback
- **JetBrains Mono**: Code-friendly monospace
- **Playfair Display**: Elegant, sophisticated serif for literary feel
- **Poppins**: Geometric, friendly sans-serif with rounded characters
- **Crimson Text**: Classical serif designed for book typography

#### **Font Loading & Persistence:**
- **Next.js Integration**: Fonts loaded via `next/font/google` for optimization
- **Priority-based Loading**: localStorage takes precedence over database for new fonts
- **Cross-device Sync**: Database stores compatible mappings for basic synchronization
- **Legacy Compatibility**: Automatic migration from old font selections
- **Theme Script**: Immediate font application to prevent flash during page load

#### **Technical Implementation:**
```typescript
// Font types in FontContext.tsx
type FontFamily = 'sans' | 'serif' | 'mono' | 'playfair' | 'poppins' | 'crimson';

// Database compatibility mapping for new fonts
const dbCompatibleFonts = {
  'playfair': 'serif',  // Maps to serif for database storage
  'poppins': 'sans',    // Maps to sans for database storage  
  'crimson': 'serif'    // Maps to serif for database storage
};
```

#### **Font System Features:**
- **Real-time Preview**: Font previews in settings use actual font styling
- **CSS Variables**: Fonts defined as CSS custom properties for theme system
- **Global Application**: Font changes apply immediately to entire application
- **Fallback Strategy**: Multiple layers of fallback (localStorage → database → defaults)

### UI/UX Improvements

#### **Sidebar Conversation Management (`Sidebar.tsx`)**:
- **Hover-based Actions**: Edit and delete buttons appear on conversation hover without requiring clicks
- **Overlay Design**: Action buttons overlay conversation titles with gradient background for clean appearance
- **Full-width Titles**: Conversation titles extend to full sidebar width for better space utilization
- **Smart Background**: Gradient overlays match conversation selection state (primary vs muted themes)

#### **Chain of Thought Display (`CollapsibleThinking.tsx`)**:
- **Simplified Design**: Clean, minimal header with chevron icon and "Reasoning" label
- **Smart Expansion**: Uses `ChevronRight` when collapsed, `ChevronDown` when expanded
- **Auto-collapse**: Automatically collapses 1 second after reasoning completion
- **Reduced Spacing**: Optimized spacing between reasoning section and message content

#### **Settings Interface (`SettingsDialog.tsx`)**:
- **Streamlined Tabs**: Removed Visual Options tab for cleaner interface
- **Accessibility**: Added proper `DialogDescription` for screen reader compatibility
- **Font Variety**: Enhanced font selection with distinctive typeface options
- **Real-time Previews**: Font selection shows actual font rendering in preview

### LLM Provider Integration
The `@orion-chat/llm-adapters` package provides unified interface for:
- OpenAI (gpt-4o-mini for cost optimization) - **Supports PDF uploads via Files API**
- Anthropic (Claude 3.5 Haiku) - **Supports PDF uploads with base64 encoding**
- Google AI (Gemini models) - **Supports PDF uploads via Files API**
- Google Vertex AI (Gemini models with native web search) - **Supports native search grounding**
- DeepSeek (reasoning models) - **Supports web search via function calling**

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

# Vertex AI (for Gemini web search)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
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
5. For web search: Implement function calling with external search APIs (SerpAPI, Bing, etc.)

### PDF File Support Implementation
The application supports PDF uploads to multiple LLM providers:

**File Upload Process (`api/files/upload/route.ts`)**:
1. **Optimized Provider-Specific Uploads**: PDFs are uploaded only to the currently selected AI provider (not all providers):
   - OpenAI: Uses Files API with `purpose: "user_data"`
   - Anthropic: Uses Files API with beta headers and retry logic for timeout handling
   - Gemini: Uses FileManager with display name
2. Provider-specific file IDs are stored in the `files` table
3. Files are also stored in Supabase storage for fallback access
4. **Performance**: Upload time reduced by ~66% since only one provider upload occurs instead of three

**Chat Integration (`api/chat/stream/route.ts`)**:
- PDF attachments are processed based on provider:
  - OpenAI: Uses `file_id` reference in message content
  - Anthropic: Downloads from storage, converts to base64
  - Gemini: Uses `file_uri` reference directly
- Multimodal content is structured per provider's API requirements

**Provider Implementations**:
- **OpenAI** (`openai-mini.ts`): Direct file_id reference with `type: 'file'`
- **Anthropic** (`claude-haiku.ts`): Base64 conversion with `type: 'document'` for PDFs, `type: 'image'` for images
- **Gemini**: File URI reference (existing implementation)

### Claude 3.5 Haiku Vision Support Implementation
**Multimodal Content Processing**:
Claude 3.5 Haiku supports both PDF documents and image analysis. Key implementation details:

1. **Beta Header Management**: The `anthropic-beta: pdfs-2024-09-25` header is only applied when PDF content is detected, not globally. This prevents interference with image processing.

2. **Image Format Detection**: Automatic MIME type detection from base64 data using magic number analysis:
   - JPEG: `0xFF 0xD8 0xFF`
   - PNG: `0x89 0x50 0x4E 0x47`
   - GIF: `0x47 0x49 0x46`
   - WebP: `0x52 0x49 0x46 0x46`

3. **Content Structure**: Images use Claude's specific format:
   ```javascript
   {
     type: 'image',
     source: {
       type: 'base64',
       media_type: 'image/jpeg', // Detected format
       data: 'base64EncodedImageData'
     }
   }
   ```

4. **Error Prevention**: The system validates MIME types against actual image data to prevent "Image does not match the provided media type" errors.

### File Upload UX Implementation
**Enhanced Upload Experience (`ChatInput.tsx`)**:
1. **Non-blocking Input**: Users can type messages while files are uploading
2. **Real-time Progress**: XMLHttpRequest-based progress tracking with accurate percentages
3. **Upload Cancellation**: Users can cancel uploads in progress using the X button
4. **Visual Feedback**: 
   - Spinning loader with percentage display during upload
   - Image thumbnails for uploaded images (8x8px previews)
   - Progress bar showing actual upload progress (0-80%) + server processing (80-100%)
5. **Smart Progress Tracking**: Accounts for both file transfer and server-side provider uploads
6. **Optimistic UI**: Files appear immediately with uploading state before actual upload

### Database Schema Changes
1. Create migration in `supabase/migrations/`
2. Run `supabase db reset` to apply locally
3. Regenerate types: `supabase gen types typescript --local`
4. **Important**: If types don't match actual schema, manually extend types in component files

**⚠️ Critical Note**: The `user_profiles` table uses individual columns (`preferred_model_name`, `preferred_model_provider`, etc.) NOT a JSONB `preferences` column. Always verify actual database schema before making changes to user profile queries.

### Testing Streaming
- Use browser DevTools Network tab to monitor SSE connections
- Check `data:` events for proper JSON formatting
- Verify database operations don't block streaming responses

### Testing PDF Support
1. Upload PDF files through the chat interface
2. Verify successful upload to selected provider API in console logs
3. Test chat functionality with each supported model (GPT-4o-mini, Claude 3.5 Haiku, Gemini)
4. Check file processing status in Supabase `files` table

### Gemini Web Search Integration (Vertex AI)
**Native Search Grounding**:
- Gemini 2.0 Flash and 2.5 Flash support native web search through Google's Vertex AI
- Uses `google_search: {}` tool configuration for search grounding
- Automatically includes search results in responses when enabled
- Smart routing: Regular Gemini API for chat, Vertex AI when search is enabled

**Implementation Details**:
- **Provider**: `GeminiVertexProvider` handles authentication and search tools
- **Authentication**: Uses service account JSON credentials for Vertex AI access
- **Search Tool**: `tools: [{ google_search: {} }]` enables native search grounding
- **UI Integration**: Search toggle automatically routes to Vertex AI when enabled

**Technical Architecture**:
```javascript
// Smart provider routing in API route
const shouldUseVertexAI = isGeminiModel && webSearch && conversation.is_web_search_enabled;
if (shouldUseVertexAI) {
  actualProvider = 'google-vertex';
}
```

**Search Grounding Output**: Responses include search sources, queries used, and grounding metadata automatically.

### DeepSeek R1 Web Search Integration
**Capability Overview**:
- DeepSeek R1 supports web search through function calling (not built-in)
- Compatible with OpenAI-style function calling patterns
- Cost-effective: 90-95% cheaper than GPT-4o while supporting external tools
- API-compatible with OpenAI SDK for easy integration

**Implementation Options**:
1. **Function Calling Pattern**: Define web search as an external function
2. **Search API Integration**: Use SerpAPI, Bing Search API, or DuckDuckGo
3. **Model Constants**: Update `supportsWebSearch: true` for DeepSeek R1 in `/src/lib/constants/models.ts`

**Recommended Architecture**:
```javascript
// Example search function for DeepSeek R1
const searchFunction = {
  name: "web_search", 
  description: "Search the internet for current information",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    }
  }
}
```

## Troubleshooting

### Common Issues
- **Build failures**: Ensure all packages are built (`npm run build`)
- **Import errors**: Check workspace dependencies in package.json files
- **Supabase connection**: Verify `supabase start` is running locally
- **Streaming issues**: Check network tab for SSE connection status
- **Type errors**: Regenerate database types after schema changes
- **PDF upload failures**: Check API keys for selected provider (provider-specific uploads)
- **TypeScript errors**: If auto-generated types don't match schema, manually extend types with intersection (&) operator

### Performance Issues
- Monitor streaming response times in browser DevTools
- Check database query performance in Supabase Studio
- Verify async database operations aren't blocking streams

### Claude 3.5 Haiku Vision Troubleshooting
- **"Image does not match provided media type" error**: Fixed by implementing automatic MIME type detection from base64 data instead of relying on file extensions
- **Images not working but PDFs working**: Fixed by removing global `anthropic-beta` header and applying it conditionally only for PDF content
- **Vision capability**: Claude 3.5 Haiku supports vision as of February 24th, 2025 - no special beta header required for images
- **Beta header conflicts**: PDF and vision capabilities use different requirements - PDF needs `anthropic-beta: pdfs-2024-09-25`, images work with default API

### Vertex AI Authentication Troubleshooting
- **"Unable to authenticate your request" error**: Fixed by implementing JSON credential parsing for serverless environments
- **GoogleAuthError in Vercel**: The `GOOGLE_APPLICATION_CREDENTIALS` environment variable must contain the actual JSON content, not a file path
- **Authentication method**: Vertex AI provider now tries JSON parsing first, then falls back to file path for local development
- **Environment variable format**: In Vercel, paste the entire service account JSON as the `GOOGLE_APPLICATION_CREDENTIALS` value
- **Debug endpoint**: Use `/api/debug-vertex` to verify environment variables are properly loaded in production
- **Smart routing**: Gemini models automatically use Vertex AI when web search is enabled

### PDF-Specific Troubleshooting
- **File size limits**: OpenAI (32MB), Anthropic (varies), Gemini (varies)
- **Model compatibility**: Ensure using PDF-compatible models (GPT-4o-mini, Claude 3.5 Haiku, Gemini)
- **API errors**: Check provider-specific error messages in console
- **Base64 conversion issues**: Monitor Supabase storage access for Anthropic implementation
- **Anthropic timeouts**: Upload includes retry logic (3 attempts with exponential backoff)
- **Progress tracking**: Uses XMLHttpRequest for real progress vs simulated progress
- **Provider name mismatch**: Ensure provider constants match API expectations ('google' not 'google-ai')

### Font System Troubleshooting
- **Font not persisting after refresh**: Fixed by priority-based loading (localStorage overrides database for new fonts)
- **Database constraint errors**: New fonts map to compatible values (`playfair`→`serif`, `poppins`→`sans`, `crimson`→`serif`)
- **Theme script errors**: Added safety checks for `document.body` availability during SSR
- **Font loading failures**: Next.js font optimization ensures proper loading and fallbacks
- **Cross-device font sync**: Database stores mapped values while localStorage preserves specific font choices
- **Legacy font migration**: Automatic mapping from old font names (`inter`→`sans`, `roboto`→`poppins`, `opensans`→`poppins`)

### UI Component Troubleshooting
- **Sidebar action buttons not visible**: Ensure gradient backgrounds match conversation state classes
- **Reasoning section spacing issues**: Verify `mb-2` spacing and proper auto-collapse timing
- **Settings accessibility warnings**: Ensure `DialogDescription` is included for screen readers
- **Font preview not working**: Check CSS variables and font-preview class definitions in globals.css