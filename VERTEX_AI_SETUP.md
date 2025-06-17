# Setting Up Vertex AI for Native Google Search Grounding

To get the same search grounding functionality as AI Studio, you need to use Vertex AI instead of the Gemini Developer API.

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud Project with billing enabled
2. **Vertex AI API**: Enable the Vertex AI API in your project
3. **Authentication**: Set up service account authentication

## Step-by-Step Setup

### 1. Create/Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID** (not the project name)

### 2. Enable Vertex AI API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Vertex AI API"
3. Click **Enable**

### 3. Set Up Authentication

#### Option A: Service Account (Recommended for Production)

1. Go to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Give it a name like "orion-chat-vertex"
4. Grant these roles:
   - **Vertex AI User**
   - **ML Developer** (optional, for advanced features)
5. Click **Create Key** and download the JSON file
6. Save the JSON file securely (e.g., `/path/to/service-account-key.json`)

#### Option B: Application Default Credentials (Development)

Run this command in your terminal:
```bash
gcloud auth application-default login
```

### 4. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Authentication (choose one method)

# Method A: Service Account Key File
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Method B: Service Account Key JSON (inline)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### 5. Update API Route

Update your `/api/chat/stream/route.ts` to use Vertex AI:

```typescript
// Initialize LLM Router with Vertex AI
const router = new LLMRouter({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_AI_API_KEY, // Keep for fallback
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  // Add Vertex AI configuration
  googleProjectId: process.env.GOOGLE_CLOUD_PROJECT,
  googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});
```

### 6. Update Model Configuration

Add Vertex AI models to your model constants:

```typescript
// In your models.ts file
{
  id: 'gemini-1.5-flash-002',
  name: 'gemini-1.5-flash-002',
  provider: 'google-vertex', // Use the new provider
  displayName: 'Gemini 1.5 Flash (Vertex AI)',
  description: 'Google\'s model with native search grounding via Vertex AI',
  supportsWebSearch: true, // Native search grounding
  // ... other properties
},
```

### 7. Test the Setup

1. Select the Vertex AI Gemini model in your chat
2. Enable web search
3. Ask a question requiring current information
4. You should get search-grounded responses like AI Studio

## Pricing

- **Vertex AI**: Pay-per-use pricing for API calls
- **Search Grounding**: $35 per 1,000 grounded queries
- **Standard Generation**: Standard Gemini API pricing

## Troubleshooting

### Authentication Issues

- Make sure your service account has the right permissions
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to a valid JSON file
- Verify your project ID is correct

### API Errors

- Ensure Vertex AI API is enabled in your project
- Check that your project has billing enabled
- Verify you're using the correct region

### Search Not Working

- Confirm you're using the `google-vertex` provider, not `google`
- Check that web search is enabled in your request
- Look for grounding metadata in the response logs

## Benefits of Vertex AI

✅ **Native Search Grounding**: Same as AI Studio  
✅ **Enterprise Features**: Advanced model configurations  
✅ **Better Rate Limits**: Higher quotas for production use  
✅ **Direct Google Integration**: No third-party search APIs needed  
✅ **Consistent Results**: Same search quality as AI Studio  

The Vertex AI approach gives you the exact same search grounding capabilities as Google AI Studio!