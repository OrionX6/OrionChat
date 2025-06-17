-- Add appearance settings columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN color_theme TEXT DEFAULT 'default' CHECK (color_theme IN ('default', 'ocean', 'forest', 'sunset', 'lavender', 'rose')),
ADD COLUMN font_family TEXT DEFAULT 'sans' CHECK (font_family IN ('sans', 'serif', 'mono', 'inter', 'roboto', 'opensans'));

-- Update the existing theme column to be more specific (base_theme)
ALTER TABLE user_profiles RENAME COLUMN theme TO base_theme;

-- Add check constraint for base_theme
ALTER TABLE user_profiles 
ADD CONSTRAINT check_base_theme CHECK (base_theme IN ('light', 'dark', 'system'));

-- Add comments
COMMENT ON COLUMN user_profiles.base_theme IS 'User preferred base theme: light, dark, or system';
COMMENT ON COLUMN user_profiles.color_theme IS 'User preferred color theme variant';
COMMENT ON COLUMN user_profiles.font_family IS 'User preferred font family for reading messages';