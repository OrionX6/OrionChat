# Quick Vertex AI Setup Guide

## What You Need to Do Next

### 1. Set Environment Variables

Add these to your `.env.local` file:

```bash
# Your Google Cloud Project ID (get this from Google Cloud Console)
GOOGLE_CLOUD_PROJECT=your-project-id-here

# Region (usually us-central1)
GOOGLE_CLOUD_LOCATION=us-central1

# Path to your service account key file
GOOGLE_APPLICATION_CREDENTIALS=/Users/orionx6/Desktop/OrionChat/packages/llm-adapters/src/providers/.google/service-account-key.json
```

### 2. Rename Your Service Account Key

Make sure your downloaded JSON key file is named:
```
/Users/orionx6/Desktop/OrionChat/packages/llm-adapters/src/providers/.google/service-account-key.json
```

### 3. Test the Setup

1. **Start the dev server**: `npm run dev`
2. **Select a Vertex AI model**: Look for models with "(Vertex AI)" in the name
3. **Enable web search**: Click the Search button
4. **Ask a question**: Try "What are the latest AI developments?"

### 4. What You Should See

✅ **Success**: 
- Console logs showing "Vertex AI initialized"
- "VERTEX AI: Enabling native Google Search grounding..."
- Search-grounded responses like AI Studio

❌ **If it doesn't work**:
- Check console for authentication errors
- Verify your project ID is correct
- Ensure Vertex AI API is enabled in Google Cloud

## Available Vertex AI Models

- **Gemini 2.0 Flash (Vertex AI)**: Fast with native search
- **Gemini 2.5 Flash (Vertex AI)**: Advanced with native search + reasoning

## Key Benefits

🎯 **Native Search Grounding**: Same as AI Studio  
🔍 **Real-time Information**: Current web data  
📊 **Source Attribution**: Proper citations  
🚀 **Enterprise Quality**: Vertex AI reliability  

## Troubleshooting

**Authentication Issues**:
- Make sure your service account has "Vertex AI User" role
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to the correct file
- Verify your project ID is exact (not the project name)

**API Issues**:
- Ensure Vertex AI API is enabled in Google Cloud Console
- Check that billing is enabled for your project
- Verify you're using the correct region

Once configured, you'll have the exact same search grounding as Google AI Studio! 🎉