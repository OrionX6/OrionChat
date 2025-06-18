"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Database } from '@/lib/types/database';

type FileAttachment = Database['public']['Tables']['files']['Row'];

export function useUserAttachments() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const supabase = createClient();

  // Load user's attachments
  useEffect(() => {
    async function loadAttachments() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1000); // Explicit limit to ensure we get more than 100

        if (error) {
          console.error('Error loading attachments:', error);
        } else {
          setAttachments(data || []);
        }
      } catch (error) {
        console.error('Error loading attachments:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAttachments();
  }, [user, supabase]);

  // Delete attachments
  const deleteAttachments = async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    try {
      // First, get the file details we need for cleanup
      console.log(`🔍 Fetching details for ${ids.length} files to delete:`, ids);
      
      const { data: filesToDelete, error: fetchError } = await supabase
        .from('files')
        .select('id, storage_path, openai_file_id, anthropic_file_id, gemini_file_uri, original_name, user_id')
        .in('id', ids);

      if (fetchError) {
        console.error('❌ Error fetching files for deletion:', fetchError);
        throw fetchError;
      }

      if (!filesToDelete || filesToDelete.length === 0) {
        console.warn(`⚠️ No files found in database with IDs:`, ids);
        return;
      }

      // Security check: ensure all files belong to current user
      const userFiles = filesToDelete.filter(f => f.user_id === user.id);
      const otherUserFiles = filesToDelete.filter(f => f.user_id !== user.id);
      
      if (otherUserFiles.length > 0) {
        console.warn(`🚫 Skipping ${otherUserFiles.length} files that don't belong to current user:`, 
          otherUserFiles.map(f => f.original_name));
      }

      if (userFiles.length === 0) {
        console.warn(`⚠️ No files belong to current user. Nothing to delete.`);
        return;
      }

      console.log(`🗑️ Starting deletion of ${userFiles.length} files belonging to user:`, 
        userFiles.map(f => f.original_name).join(', '));

      // Delete from Supabase Storage
      for (const file of userFiles) {
        if (file.storage_path) {
          console.log(`🗂️ Attempting to delete from storage bucket 'attachments': ${file.storage_path}`);
          
          // First, check if the file exists
          const { data: listData, error: listError } = await supabase.storage
            .from('attachments')
            .list('', { search: file.storage_path });
            
          if (listError) {
            console.error(`❌ Error checking if file exists in storage:`, listError);
          } else {
            console.log(`📋 File existence check result:`, listData);
          }
          
          const { data: removeData, error: storageError } = await supabase.storage
            .from('attachments')
            .remove([file.storage_path]);

          if (storageError) {
            console.error(`❌ Failed to delete file from storage: ${file.storage_path}`, storageError);
            // Continue with other deletions even if storage deletion fails
          } else {
            console.log(`✅ Storage deletion response:`, removeData);
            console.log(`✅ Deleted from storage: ${file.storage_path}`);
            
            // Verify deletion by checking if file still exists
            const { data: verifyData, error: verifyError } = await supabase.storage
              .from('attachments')
              .list('', { search: file.storage_path });
              
            if (!verifyError && verifyData) {
              if (verifyData.length === 0) {
                console.log(`✅ Confirmed: File no longer exists in storage`);
              } else {
                console.warn(`⚠️ File still exists in storage after deletion attempt!`, verifyData);
              }
            }
          }
        } else {
          console.warn(`⚠️ No storage_path found for file: ${file.original_name}`);
        }
      }

      // Update messages to remove attachment references
      // First get user's conversations to filter messages
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);

      if (!userConversations || userConversations.length === 0) {
        console.log('No conversations found for user');
      } else {
        const conversationIds = userConversations.map(c => c.id);
        
        const { data: messagesWithAttachments, error: messagesError } = await supabase
          .from('messages')
          .select('id, attachments')
          .in('conversation_id', conversationIds)
          .not('attachments', 'is', null);

        if (!messagesError && messagesWithAttachments) {
          for (const message of messagesWithAttachments) {
            try {
              const attachments = typeof message.attachments === 'string' 
                ? JSON.parse(message.attachments) 
                : message.attachments;

              if (Array.isArray(attachments)) {
                // Filter out deleted file references
                const filteredAttachments = attachments.filter(
                  (att: any) => !ids.includes(att.id)
                );

                // Update message if attachments were removed
                if (filteredAttachments.length !== attachments.length) {
                  const newAttachments = filteredAttachments.length > 0 ? JSON.stringify(filteredAttachments) : null;
                  
                  const { error: updateError } = await supabase
                    .from('messages')
                    .update({ attachments: newAttachments })
                    .eq('id', message.id);

                  if (updateError) {
                    console.error(`Failed to update message ${message.id}:`, updateError);
                  } else {
                    console.log(`✅ Updated message ${message.id} attachment references`);
                  }
                }
              }
            } catch (parseError) {
              console.error(`Error parsing attachments for message ${message.id}:`, parseError);
            }
          }
        }
      }

      // Finally, delete from the files table (with user security check)
      const userFileIds = userFiles.map(f => f.id);
      console.log(`🗂️ Attempting to delete ${userFileIds.length} files from database:`, userFileIds);
      
      const { data: deletedFiles, error: deleteError } = await supabase
        .from('files')
        .delete()
        .in('id', userFileIds)
        .eq('user_id', user.id) // Security: only delete files owned by current user
        .select('id, original_name'); // Return what was actually deleted

      if (deleteError) {
        console.error('❌ Error deleting files from database:', deleteError);
        throw deleteError;
      }

      if (deletedFiles && deletedFiles.length > 0) {
        console.log(`✅ Successfully deleted ${deletedFiles.length} files from database:`, 
          deletedFiles.map(f => f.original_name).join(', '));
      } else {
        console.warn(`⚠️ No files were deleted from database. Expected ${userFileIds.length} but got 0.`);
        console.warn('This might mean the files don\'t exist or don\'t belong to the current user.');
      }

      // Remove from local state
      setAttachments(prev => prev.filter(file => !ids.includes(file.id)));
      
      // Clear selection
      setSelectedIds(new Set());

    } catch (error) {
      console.error('Error deleting attachments:', error);
      throw error;
    }
  };

  // Delete single attachment
  const deleteAttachment = async (id: string) => {
    return deleteAttachments([id]);
  };

  // Selection management
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(attachments.map(file => file.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id: string) => selectedIds.has(id);
  const isAllSelected = attachments.length > 0 && selectedIds.size === attachments.length;
  const selectedCount = selectedIds.size;

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📎';
  };

  return {
    attachments,
    loading,
    selectedIds,
    selectedCount,
    isSelected,
    isAllSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    deleteAttachment,
    deleteAttachments: () => deleteAttachments(Array.from(selectedIds)),
    formatFileSize,
    getFileIcon,
  };
}