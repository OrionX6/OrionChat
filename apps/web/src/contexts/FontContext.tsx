"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type FontFamily = 'sans' | 'serif' | 'mono' | 'playfair' | 'poppins' | 'crimson';

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
      const stored = localStorage.getItem('font-family') as string;
      
      // Handle legacy font mappings from localStorage
      const legacyFontMappings: Record<string, FontFamily> = {
        'inter': 'sans',
        'roboto': 'poppins',
        'opensans': 'poppins'
      };
      
      if (stored && legacyFontMappings[stored]) {
        return legacyFontMappings[stored];
      }
      
      return (stored as FontFamily) || defaultFont;
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
          // Check if localStorage has a new font that we should prioritize
          const localStorageFont = typeof window !== 'undefined' ? localStorage.getItem('font-family') : null;
          const newFonts = ['playfair', 'poppins', 'crimson'];
          
          // If localStorage has a new font, prioritize it over database
          if (localStorageFont && newFonts.includes(localStorageFont)) {
            if (localStorageFont !== fontFamily) {
              setFontFamilyState(localStorageFont as FontFamily);
            }
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('user_profiles')
            .select('font_family')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            let dbFont = (data.font_family as FontFamily) || 'sans';
            
            // Handle legacy font mappings
            const legacyFontMappings: Record<string, FontFamily> = {
              'inter': 'sans',
              'roboto': 'poppins',
              'opensans': 'poppins'
            };
            
            if (legacyFontMappings[dbFont as string]) {
              dbFont = legacyFontMappings[dbFont as string];
            }
            
            // Only update if different from current value to avoid unnecessary re-renders
            if (dbFont !== fontFamily) {
              setFontFamilyState(dbFont);
            }
          }
        }
      } catch (error) {
        console.error('Error loading font from database:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [supabase]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const body = window.document.body;
    if (!body) return; // Safety check

    // Remove previous font classes
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-playfair', 'font-poppins', 'font-crimson');

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

      // Map new fonts to database-compatible values for now
      // This is a temporary solution until the database constraint is updated
      const dbCompatibleFonts: Record<FontFamily, string> = {
        'sans': 'sans',
        'serif': 'serif', 
        'mono': 'mono',
        'playfair': 'serif', // Map to serif for database compatibility
        'poppins': 'sans',   // Map to sans for database compatibility
        'crimson': 'serif'   // Map to serif for database compatibility
      };
      
      const dbFont = dbCompatibleFonts[font];

      // First try to update existing record
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ font_family: dbFont, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        // If update fails, try upsert
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email!,
            font_family: dbFont,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Font save failed:', error.message);
          // Continue anyway - localStorage will be the fallback
        }
      }
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
