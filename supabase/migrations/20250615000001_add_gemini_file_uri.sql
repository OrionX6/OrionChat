-- Add gemini_file_uri column to files table for storing Gemini Files API URIs
ALTER TABLE public.files 
ADD COLUMN gemini_file_uri TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.files.gemini_file_uri IS 'URI from Gemini Files API for direct PDF processing';
