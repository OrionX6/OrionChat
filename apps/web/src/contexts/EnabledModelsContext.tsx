"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AVAILABLE_MODELS } from '@/lib/constants/models';

type EnabledModelsContextType = {
  enabledModels: Set<string>;
  toggleModel: (modelId: string) => void;
  isModelEnabled: (modelId: string) => boolean;
  getEnabledModels: () => typeof AVAILABLE_MODELS;
  loading: boolean;
};

const EnabledModelsContext = createContext<EnabledModelsContextType | undefined>(undefined);

interface EnabledModelsProviderProps {
  children: React.ReactNode;
}

export function EnabledModelsProvider({ children }: EnabledModelsProviderProps) {
  // Initialize with all models enabled by default
  const [enabledModels, setEnabledModels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load enabled models from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('enabled-models');
      if (stored) {
        const enabledList = JSON.parse(stored);
        setEnabledModels(new Set(enabledList));
      } else {
        // Default: enable all models
        const allModelIds = AVAILABLE_MODELS.map(m => m.id);
        setEnabledModels(new Set(allModelIds));
      }
    } catch (error) {
      console.error('Error loading enabled models:', error);
      // Fallback: enable all models
      const allModelIds = AVAILABLE_MODELS.map(m => m.id);
      setEnabledModels(new Set(allModelIds));
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage whenever enabled models change
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('enabled-models', JSON.stringify(Array.from(enabledModels)));
      } catch (error) {
        console.error('Error saving enabled models:', error);
      }
    }
  }, [enabledModels, loading]);

  const toggleModel = (modelId: string) => {
    setEnabledModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        // Prevent disabling the last model
        if (newSet.size === 1) {
          console.warn('Cannot disable the last remaining model');
          return prev;
        }
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  const isModelEnabled = (modelId: string) => {
    return enabledModels.has(modelId);
  };

  const getEnabledModels = () => {
    return AVAILABLE_MODELS.filter(model => enabledModels.has(model.id));
  };

  const value = {
    enabledModels,
    toggleModel,
    isModelEnabled,
    getEnabledModels,
    loading,
  };

  return (
    <EnabledModelsContext.Provider value={value}>
      {children}
    </EnabledModelsContext.Provider>
  );
}

export const useEnabledModels = () => {
  const context = useContext(EnabledModelsContext);
  if (context === undefined) {
    throw new Error('useEnabledModels must be used within a EnabledModelsProvider');
  }
  return context;
};