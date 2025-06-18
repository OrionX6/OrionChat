# OrionChat Database Schema

This document describes the database schema and setup for OrionChat, a modern AI chat application built with Next.js and Supabase.

## Overview

OrionChat uses PostgreSQL with the pgvector extension for vector similarity search, enabling advanced features like:

- **RAG (Retrieval Augmented Generation)** for document chat
- **Semantic search** across conversation history
- **Vector embeddings** for content similarity
- **Real-time messaging** with Supabase Realtime
- **Row Level Security (RLS)** for data isolation

## Architecture

### Core Tables

#### `user_profiles`
Stores user information and preferences, extending Supabase Auth users.

```sql
- id (UUID, FK to auth.users)
- email (TEXT, unique)
- display_name (TEXT)
- avatar_url (TEXT)
- role (ENUM: user, admin, moderator)
- preferred_model_provider (ENUM)
- preferred_model_name (TEXT)
- usage statistics and quotas
```

#### `conversations`
Chat conversations with model configuration.

```sql
- id (UUID, primary key)
- user_id (UUID, FK to user_profiles)
- title (TEXT)
- model_provider (ENUM)
- model_name (TEXT)
- temperature, max_tokens, system_prompt
- feature flags (document_chat, image_generation, web_search)
- usage statistics
```

#### `messages`
Individual chat messages with embeddings for search.

```sql
- id (UUID, primary key)
- conversation_id (UUID, FK to conversations)
- user_id (UUID, FK to user_profiles)
- role (ENUM: user, assistant, system)
- content (TEXT)
- provider, model, tokens_used, cost_usd
- embedding (vector(1536)) for similarity search
- tool_calls, attachments (JSONB)
```

#### `files`
Uploaded files with processing status.

```sql
- id (UUID, primary key)
- user_id (UUID, FK to user_profiles)
- conversation_id (UUID, FK to conversations, nullable)
- original_name, storage_path, mime_type, file_size
- processing_status (ENUM: pending, processing, completed, failed)
- extracted_text, chunk_count
```

#### `document_chunks`
Processed document chunks for RAG functionality.

```sql
- id (UUID, primary key)
- file_id (UUID, FK to files)
- user_id (UUID, FK to user_profiles)
- content (TEXT)
- chunk_index, page_number, heading
- embedding (vector(1536)) for semantic search
- metadata (JSONB)
```

#### `generated_images`
AI-generated images with metadata.

```sql
- id (UUID, primary key)
- user_id (UUID, FK to user_profiles)
- conversation_id, message_id (UUIDs, nullable)
- prompt, model, storage_path
- dimensions, format, generation_time_ms, cost_usd
```

#### `usage_logs`
Detailed usage tracking for analytics and billing.

```sql
- id (UUID, primary key)
- user_id (UUID, FK to user_profiles)
- conversation_id, message_id (UUIDs, nullable)
- action, provider, model
- tokens_used, cost_usd
- metadata (JSONB)
```

### Support Tables

#### `system_prompt_templates`
Reusable system prompt templates for conversations.

#### `file_type_configs`
Configuration for supported file types and processing rules.

## Vector Search

The schema includes two vector columns using pgvector:

1. **`messages.embedding`**: For searching conversation history
2. **`document_chunks.embedding`**: For RAG document search

Both use OpenAI's `text-embedding-3-small` model (1536 dimensions).

### Search Functions

```sql
-- Search similar messages
search_similar_messages(embedding, user_id, conversation_id?, threshold?, limit?)

-- Search similar document chunks
search_similar_chunks(embedding, user_id, threshold?, limit?)
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Example policy
CREATE POLICY "Users can view own conversations" 
ON conversations FOR SELECT 
USING (auth.uid() = user_id);
```

### Data Isolation

- All user data is isolated by `user_id`
- No cross-user data access possible
- Admin users have separate permissions via role column

## Setup Instructions

### Prerequisites

1. **Supabase Project**: Either local or hosted
2. **PostgreSQL**: Version 15+ with pgvector extension
3. **Environment Variables**: Configured in `.env.local`

### Local Development

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase**:
   ```bash
   supabase init
   supabase start
   ```

3. **Apply Migrations**:
   ```bash
   # Option 1: Using Supabase CLI
   supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres
   
   # Option 2: Using our setup script
   npx tsx scripts/setup-database.ts --seed
   ```

4. **Configure Storage Buckets**:
   ```bash
   # Create buckets via Supabase dashboard or CLI
   supabase storage create documents --public=false
   supabase storage create images --public=false
   ```

### Production Setup

1. **Create Supabase Project**: Via dashboard or CLI
2. **Enable Extensions**: pgvector must be enabled
3. **Apply Schema**: Upload migration files or use SQL editor
4. **Configure Auth**: Set up authentication providers
5. **Set Environment Variables**: In your deployment platform

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional but recommended
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Migrations

### Current Migrations

- **001_initial_schema.sql**: Complete initial schema
- **seed.sql**: Sample data and utility functions

### Running Migrations

```bash
# Local development
supabase db reset

# Production (careful!)
supabase db push --db-url postgresql://...
```

### Creating New Migrations

```bash
supabase migration new your_migration_name
# Edit the generated SQL file
supabase db reset  # Test locally
```

## Performance

### Indexes

The schema includes optimized indexes for:

- **User data queries**: All user_id foreign keys
- **Time-based queries**: created_at, updated_at columns
- **Vector similarity**: IVFFlat indexes on embedding columns
- **Search queries**: Common filter combinations

### Vector Index Configuration

```sql
-- Messages similarity search
CREATE INDEX idx_messages_embedding 
ON messages USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Document chunks similarity search  
CREATE INDEX idx_document_chunks_embedding 
ON document_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Query Optimization

- Use `LIMIT` clauses for large result sets
- Filter by `user_id` first to leverage RLS
- Use vector similarity thresholds (> 0.7) to limit results
- Consider pagination for message history

## Maintenance

### Regular Tasks

1. **Archive old messages**: Use `archive_old_messages()` function
2. **Clean orphaned files**: Use `cleanup_orphaned_files()` function
3. **Monitor usage**: Check `performance_stats` view
4. **Update vector indexes**: Rebuild periodically for optimal performance

### Monitoring Queries

```sql
-- Database size and table statistics
SELECT * FROM performance_stats;

-- User activity summary
SELECT * FROM user_activity_summary;

-- Recent high-usage users
SELECT email, total_cost_usd, total_tokens_used 
FROM user_profiles 
ORDER BY total_cost_usd DESC 
LIMIT 10;
```

### Backup Strategy

1. **Automated backups**: Configure via Supabase dashboard
2. **Point-in-time recovery**: Available in Supabase Pro+
3. **Manual exports**: Use `pg_dump` for specific tables
4. **Vector embeddings**: Consider separate backup strategy

## Troubleshooting

### Common Issues

#### pgvector Extension Missing
```sql
-- Enable in SQL editor
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
```

#### RLS Blocking Queries
```sql
-- Check if user is authenticated
SELECT auth.uid();

-- Temporarily disable for debugging (dev only!)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

#### Vector Search Not Working
```sql
-- Check if embeddings exist
SELECT COUNT(*) FROM messages WHERE embedding IS NOT NULL;

-- Verify index
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'messages' AND indexname LIKE '%embedding%';
```

#### Performance Issues
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC;

-- Analyze table statistics
ANALYZE messages;
ANALYZE document_chunks;
```

## Development Tips

### Test Data Generation

```sql
-- Generate sample data (dev only)
SELECT generate_sample_data('test@example.com');

-- Clean up test data
SELECT cleanup_test_data();
```

### Schema Changes

1. **Always test locally first**
2. **Use transactions for multi-statement changes**
3. **Back up production before applying**
4. **Consider data migration scripts**
5. **Update TypeScript types accordingly**

### Vector Embeddings

1. **Consistent model**: Always use same embedding model
2. **Normalize text**: Clean and preprocess before embedding
3. **Batch processing**: Generate embeddings in batches
4. **Error handling**: Handle API rate limits and failures
5. **Cost tracking**: Monitor embedding generation costs

## Integration Points

### Application Code

- **Type definitions**: Auto-generated from schema
- **API routes**: Use Supabase client with RLS
- **Real-time updates**: Subscribe to table changes
- **File uploads**: Direct to Supabase Storage
- **Vector search**: Use helper functions for similarity

### External Services

- **OpenAI**: For embeddings and chat completions
- **Anthropic**: For chat completions
- **Replicate**: For image generation
- **Storage**: Supabase Storage for files and images

This schema provides a robust foundation for a modern AI chat application with advanced features like document processing, image generation, and semantic search.