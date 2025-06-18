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
      const { error } = await supabase
        .from('files')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Error deleting attachments:', error);
        throw error;
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