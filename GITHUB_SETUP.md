# 🚀 Quick GitHub Setup Commands

## Step 1: Initialize Git Repository

Run these commands in your project folder:

```bash
# Initialize git repository
git init

# Add all files to git
git add .

# Make your first commit
git commit -m "Initial commit - Multiplayer Pixel Art Game"
```

## Step 2: Create GitHub Repository

1. **Go to GitHub:** https://github.com/new
2. **Repository name:** `multiplayer-pixel-art` (or your choice)
3. **Description:** `Real-time collaborative pixel art drawing with WebRTC`
4. **Visibility:** Public (recommended) or Private
5. **DON'T check:** "Add a README file" (you already have one)
6. **Click:** "Create repository"

## Step 3: Connect to GitHub

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
# Connect your local repo to GitHub
git remote add origin https://github.com/YOUR_USERNAME/multiplayer-pixel-art.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Deploy to Hosting Platform

### Option A: Render.com (Recommended)

1. **Go to:** https://render.com
2. **Sign up** with your GitHub account
3. **New Web Service** → Connect GitHub repo
4. **Settings:**
   - Name: `multiplayer-pixel-art`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. **Deploy** → Get your live URL!

### Option B: Railway

1. **Go to:** https://railway.app
2. **Sign up** with GitHub
3. **New Project** → Deploy from GitHub repo
4. **Select your repo** → Auto-deploys!

## Step 5: Update README with Live URL

Once deployed, edit README.md and replace "your-app-url" with your actual URL.

## 🎉 You're Live!

Your game is now:
- ✅ Hosted on GitHub
- ✅ Deployed to the web
- ✅ Accessible worldwide
- ✅ Auto-deploys when you push changes

**Share with friends:** `https://your-app.render.com` 