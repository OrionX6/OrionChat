-- Add thinking_content column to messages table for reasoning models like DeepSeek R1
ALTER TABLE messages ADD COLUMN thinking_content TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN messages.thinking_content IS 'Chain of thought reasoning content for reasoning models like DeepSeek R1';