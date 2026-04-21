# Technical Documentation Expert

AI-powered Microsoft Dynamics 365 Technical Documentation Specialist, built with Next.js and Claude AI.

## Deploy in 5 Minutes

### 1. Get your Anthropic API Key
- Go to https://console.anthropic.com
- Click **API Keys** → **Create Key**
- Copy the key (starts with `sk-ant-...`)

### 2. Upload to GitHub
- Go to https://github.com and create a new repository
- Drag this entire folder into the repository

### 3. Deploy on Vercel
- Go to https://vercel.com
- Click **Add New Project** → Import your GitHub repo
- Under **Environment Variables**, add:
  - Key: `ANTHROPIC_API_KEY`
  - Value: `sk-ant-your-key-here`
- Click **Deploy**

Your agent will be live at a URL like `your-project.vercel.app`

## Features
- Login screen (name + email, no password)
- Full D365 AI chat with topic classification
- Usage log with CSV export
- 12 topic categories auto-detected
