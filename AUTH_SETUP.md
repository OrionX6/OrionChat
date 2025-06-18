# Authentication Setup Guide

## Overview
This guide covers the authentication configuration for OrionChat, including fixing email verification URLs and ensuring automatic user profile creation.

## Issues Fixed

### 1. Email Verification URLs
**Problem**: Email verification links were pointing to localhost instead of the production domain.

**Solution**: 
- Added `NEXT_PUBLIC_SITE_URL` environment variable
- Updated Supabase config to use environment-based site URL
- Added fallback URLs for both local and production environments

### 2. Missing User Profiles
**Problem**: New users could authenticate but had no profile records, causing app errors.

**Solution**:
- Created database trigger to automatically create user profiles on signup
- Added fallback profile creation in AuthProvider for existing users
- Ensured all required default values are set

## Configuration Steps

### For Local Development

1. **Environment Variables** (already configured in `.env.local`):
   ```bash
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. **Database Migration**:
   ```bash
   supabase db reset
   # This will apply the new user profile trigger
   ```

### For Production Deployment

1. **Environment Variables** (add to Vercel/production):
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
   ```

2. **Supabase Dashboard Configuration**:
   - Go to your Supabase project dashboard
   - Navigate to Authentication > Settings
   - Set **Site URL** to: `https://your-production-domain.com`
   - Add to **Redirect URLs**:
     - `https://your-production-domain.com`
     - `https://your-production-domain.com/**` (for any sub-paths)

3. **Deploy and Test**:
   - Deploy with the new environment variable
   - Test user signup flow
   - Verify email verification links point to correct domain

## Database Changes

### New Migration: `20250618000001_add_user_profile_trigger.sql`

Creates:
- `handle_new_user()` function for automatic profile creation
- `on_auth_user_created` trigger on auth.users table
- Proper permissions for authenticated users

### Fallback Profile Creation

The `AuthProvider` now includes:
- Profile existence check on user authentication
- Automatic profile creation for users without profiles
- Proper error handling and logging

## Testing

### Local Testing
1. Start Supabase: `supabase start`
2. Run app: `npm run dev`
3. Test signup flow
4. Verify user profile creation in database

### Production Testing
1. Deploy with correct `NEXT_PUBLIC_SITE_URL`
2. Test email verification link destination
3. Verify new user profile creation
4. Check existing users get profiles created

## Troubleshooting

### Email Links Still Point to Localhost
- Verify `NEXT_PUBLIC_SITE_URL` is set correctly in production
- Check Supabase dashboard Site URL setting
- Ensure environment variables are available at build time

### User Profiles Not Created
- Check database logs for trigger errors
- Verify migration was applied successfully
- Check browser console for fallback creation logs
- Ensure authenticated users have INSERT permissions on user_profiles table

### Environment Variable Issues
- For Vercel: Add `NEXT_PUBLIC_SITE_URL` in project settings
- For other platforms: Ensure the variable is available at build time
- Remember: `NEXT_PUBLIC_` variables are exposed to the browser

## Security Notes

- The database trigger runs with `SECURITY DEFINER` to ensure proper permissions
- User profiles are only created for authenticated users
- All default values are safe and appropriate for new users
- No sensitive information is exposed in fallback profile creation