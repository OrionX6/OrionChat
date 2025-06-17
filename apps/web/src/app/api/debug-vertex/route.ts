import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Vertex AI environment variables
    const debugInfo: any = {
      hasGoogleApplicationCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
      googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
      googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      credentialsType: 'unknown'
    };

    // Try to parse credentials to determine type
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        debugInfo.credentialsType = 'JSON object';
        debugInfo.credentialsHasProjectId = !!parsed.project_id;
        debugInfo.credentialsProjectId = parsed.project_id;
      } catch (error) {
        debugInfo.credentialsType = 'File path or invalid JSON';
      }
    }

    return NextResponse.json({
      message: 'Vertex AI environment debug info',
      ...debugInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}