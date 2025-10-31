# ReaLM - AI-Powered Information Verifier

A Chrome extension that verifies online information and detects misinformation using AI-powered fact-checking.

## Overview

ReaLM helps you verify any claim or information you encounter online. Whether it's from social media, news articles, websites, simply capture a screenshot and our AI analyzes it against real-time web search results to determine if it's accurate or misleading.

## Features

- 🔍 **Smart Claim Extraction**: AI extracts the core claim from screenshots
- 🌐 **Real-time Verification**: Searches the web for up-to-date information
- 🎯 **Accuracy Analysis**: Compares claims against multiple credible sources
- ✅ **Clear Verdicts**: Shows if content is verified or misinformation
- 📊 **Detailed Reasoning**: Provides explanations with source references
- 🚀 **Works Everywhere**: Capture content from any website

## Demo

![Screenshot 1](extension/public/icons/Screenshot%202025-10-31%20230639.png)
![Screenshot 2](extension/public/icons/Screenshot%202025-10-31%20230927.png)
![Screenshot 3](extension/public/icons/Screenshot%202025-10-31%20230943.png)

## Technology Stack

### Backend
- **Hono** - Fast web framework for Cloudflare Workers
- **Google Gemini** - AI for claim extraction and analysis
- **Tavily** - Web search API for fact verification
- **TypeScript** - Type-safe development

### Extension
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Modern styling
- **Vite** - Fast build tool
- **Chrome Extension API** - Screen capture and messaging

### TL;DR

```bash
# Backend
cd backend
pnpm install
# Add your API keys to .dev.vars
pnpm dev

# Extension (in new terminal)
cd extension
pnpm install
pnpm build
# Load extension/dist in Chrome
```

## How It Works

1. **Capture**: User selects content on any webpage
2. **Extract**: AI extracts the main claim from the screenshot
3. **Search**: System searches the web for relevant information
4. **Analyze**: AI compares the claim against evidence
5. **Report**: User sees verification result with detailed reasoning

## Project Structure

```
ReaLM/
├── backend/              # API server
│   ├── src/
│   │   └── index.ts     # Main endpoint
│   └── package.json
├── extension/           # Chrome extension
│   ├── src/
│   │   ├── popup/      # React UI
│   │   ├── content/    # Screen capture
│   │   ├── background/ # Service worker
│   ├── public/         # Icons
│   └── manifest.json
```

## API Endpoints

### POST /verify-new

Verifies an image containing a claim.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (File)

**Response:**
```json
{
  "question": "Rephrased question for search",
  "claim": "Extracted claim text",
  "validity": true,
  "response": "Detailed analysis and reasoning"
}
```

## Development

### Backend Development
```bash
cd backend
pnpm dev
```

### Extension Development
```bash
cd extension
pnpm dev
# Reload extension in chrome://extensions/
```

## Deployment

### Backend
Deploy to Cloudflare Workers:
```bash
cd backend
pnpm deploy
```

### Extension
1. Update API URL in `extension/src/services/api.ts`
2. Build: `pnpm build`
3. Publish to Chrome Web Store

## Configuration

### Backend Environment Variables
- `GOOGLE_API_KEY` - Google Gemini API key
- `TAVILY_API_KEY` - Tavily search API key