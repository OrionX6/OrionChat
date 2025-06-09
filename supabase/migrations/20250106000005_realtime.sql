-- Enable Realtime on tables
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE files;
ALTER publication supabase_realtime ADD TABLE generated_images;
ALTER publication supabase_realtime ADD TABLE conversations;