"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type FontFamily = 'sans' | 'serif' | 'mono' | 'inter' | 'roboto' | 'opensans';

interface FontContextType {
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  loading: boolean;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

interface FontProviderProps {
  children: React.ReactNode;
  defaultFont?: FontFamily;
}

export function FontProvider({ 
  children, 
  defaultFont = 'sans'
}: FontProviderProps) {
  // Initialize with localStorage value if available to prevent flash
  const getInitialFont = (): FontFamily => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('font-family') as FontFamily;
      return stored || defaultFont;
    }
    return defaultFont;
  };

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(getInitialFont);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load settings from database when component mounts
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('font_family')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            const dbFont = (data.font_family as FontFamily) || 'sans';
            
            // Only update if different from current value to avoid unnecessary re-renders
            if (dbFont !== fontFamily) setFontFamilyState(dbFont);
          }
        }
      } catch (error) {
        console.error('Error loading font from database:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [supabase, fontFamily]);

  useEffect(() => {
    const body = window.document.body;

    // Remove previous font classes
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-inter', 'font-roboto', 'font-opensans');

    // Apply font class
    body.classList.add(`font-${fontFamily}`);

    // Store in localStorage as backup
    localStorage.setItem('font-family', fontFamily);
  }, [fontFamily]);

  // Save to database when font changes
  const saveToDatabase = async (font: FontFamily) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          font_family: font,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving font to database:', error);
    }
  };

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font);
    saveToDatabase(font);
  };

  const value = {
    fontFamily,
    setFontFamily,
    loading,
  };

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = () => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
};
