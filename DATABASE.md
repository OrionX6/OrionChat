# Database Schema Documentation

This document reflects the **ACTUAL** database schema for OrionChat, not the migration files.

## ⚠️ Important Note

The Supabase migration files may not accurately reflect the current production schema. Always refer to this document for the correct schema when writing code.

## User Profiles Table

The `user_profiles` table uses **individual columns**, NOT a JSONB `preferences` column:

```sql
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  display_name text NULL,
  avatar_url text NULL,
  role public.user_role NULL DEFAULT 'user'::user_role,
  preferred_model_provider public.model_provider NULL DEFAULT 'openai'::model_provider,
  preferred_model_name text NULL DEFAULT 'gpt-4o-mini'::text,
  preferred_language text NULL DEFAULT 'en'::text,
  base_theme text NULL DEFAULT 'system'::text,
  total_conversations integer NULL DEFAULT 0,
  total_messages integer NULL DEFAULT 0,
  total_tokens_used bigint NULL DEFAULT 0,
  total_cost_usd numeric(10, 6) NULL DEFAULT 0,
  daily_message_limit integer NULL DEFAULT 100,
  daily_token_limit bigint NULL DEFAULT 100000,
  daily_cost_limit_usd numeric(10, 2) NULL DEFAULT 5.00,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  last_active_at timestamp with time zone NULL DEFAULT now(),
  color_theme text NULL DEFAULT 'default'::text,
  font_family text NULL DEFAULT 'sans'::text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_email_key UNIQUE (email),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

## Key Schema Points

### User Preferences
- `preferred_model_name` - String column (e.g., 'gpt-4o-mini', 'claude-3-5-haiku')
- `preferred_model_provider` - ENUM column ('openai', 'anthropic', 'google', 'deepseek')
- `base_theme` - String column ('light', 'dark', 'system')
- `color_theme` - String column ('default', 'ocean', 'forest', 'sunset', 'lavender', 'rose')
- `font_family` - String column ('sans', 'serif', 'mono', 'playfair', 'poppins', 'crimson')

### Usage Tracking
- `total_conversations`, `total_messages`, `total_tokens_used`, `total_cost_usd`
- Daily limits: `daily_message_limit`, `daily_token_limit`, `daily_cost_limit_usd`

### ENUM Types
```sql
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE public.model_provider AS ENUM ('openai', 'anthropic', 'google', 'deepseek');
```

## Common Queries

### Get User Default Model
```typescript
const { data } = await supabase
  .from('user_profiles')
  .select('preferred_model_name')
  .eq('id', user.id)
  .single();
```

### Update User Default Model
```typescript
const { error } = await supabase
  .from('user_profiles')
  .update({ 
    preferred_model_name: modelName,
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id);
```

## ❌ DO NOT USE

```typescript
// WRONG - This column doesn't exist
.select('preferences')
.update({ preferences: { default_model: modelName } })
```

## ✅ CORRECT USAGE

```typescript
// CORRECT - Use individual columns
.select('preferred_model_name')
.update({ preferred_model_name: modelName })
```