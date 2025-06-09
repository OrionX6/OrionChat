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
AS $$
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
$$;

-- Function to match messages by similarity
CREATE OR REPLACE FUNCTION match_messages(
  conversation_id UUID,
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity float,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    messages.id,
    messages.content,
    (messages.embedding <#> query_embedding) * -1 AS similarity,
    messages.role,
    messages.created_at
  FROM messages
  WHERE messages.conversation_id = match_messages.conversation_id
    AND messages.embedding IS NOT NULL
    AND (messages.embedding <#> query_embedding) * -1 > match_threshold
  ORDER BY messages.embedding <#> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update user profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();