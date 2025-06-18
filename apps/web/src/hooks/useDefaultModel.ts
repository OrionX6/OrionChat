"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '@/lib/constants/models';
import { useEnabledModels } from '@/contexts/EnabledModelsContext';

export function useDefaultModel() {
  const [defaultModelName, setDefaultModelName] = useState<string>(DEFAULT_MODEL.name);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { getEnabledModels } = useEnabledModels();
  const supabase = createClient();

  // Load default model from database
  useEffect(() => {
    async function loadDefaultModel() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First try to get from localStorage as backup
        const localDefault = localStorage.getItem('default-model');
        if (localDefault && AVAILABLE_MODELS.find(m => m.name === localDefault)) {
          setDefaultModelName(localDefault);
        }

        // Then try to load from database
        const { data, error } = await supabase
          .from('user_profiles')
          .select('preferred_model_name')
          .eq('id', user.id)
          .single();

        if (!error && data?.preferred_model_name) {
          // Validate that the preferred model exists in our available models
          const modelExists = AVAILABLE_MODELS.find(m => m.name === data.preferred_model_name);
          if (modelExists) {
            setDefaultModelName(data.preferred_model_name);
            // Sync to localStorage
            localStorage.setItem('default-model', data.preferred_model_name);
          }
        }
      } catch (error) {
        console.error('Error loading default model:', error);
        // Fallback to localStorage if available
        const localDefault = localStorage.getItem('default-model');
        if (localDefault && AVAILABLE_MODELS.find(m => m.name === localDefault)) {
          setDefaultModelName(localDefault);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDefaultModel();
  }, [user, supabase]);

  // Handle when default model gets disabled
  useEffect(() => {
    const enabledModels = getEnabledModels();
    const isDefaultEnabled = enabledModels.find(m => m.name === defaultModelName);
    
    if (!loading && !isDefaultEnabled && enabledModels.length > 0) {
      // Automatically switch to the first enabled model
      const newDefault = enabledModels[0];
      setDefaultModelName(newDefault.name);
      // Also save to database and localStorage
      if (user) {
        localStorage.setItem('default-model', newDefault.name);
        supabase
          .from('user_profiles')
          .update({ 
            preferred_model_name: newDefault.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating default model:', error);
          });
      }
    }
  }, [getEnabledModels, defaultModelName, loading, user, supabase]);

  // Save default model to database and localStorage
  const setDefaultModel = async (modelName: string) => {
    if (!user) return;

    try {
      // Validate model exists
      const model = AVAILABLE_MODELS.find(m => m.name === modelName);
      if (!model) {
        console.error('Invalid model name:', modelName);
        return;
      }

      // Update local state immediately for better UX
      setDefaultModelName(modelName);
      
      // Save to localStorage as backup
      localStorage.setItem('default-model', modelName);

      // Try to save to database
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          preferred_model_name: modelName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving default model to database:', error);
        // If database save fails, try upsert
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email!,
            preferred_model_name: modelName,
            updated_at: new Date().toISOString()
          });

        if (upsertError) {
          console.error('Error upserting default model:', upsertError);
        }
      }
    } catch (error) {
      console.error('Error setting default model:', error);
    }
  };

  return {
    defaultModelName,
    setDefaultModel,
    loading,
  };
}