# 🚀 Deployment Guide - Multiplayer Pixel Art

## Option 1: Render.com (Free & Easy)

### Step 1: Prepare Your Code
1. Make sure all files are saved
2. Your `render.yaml` file is already configured

### Step 2: Deploy to Render
1. **Sign up** at [render.com](https://render.com)
2. **Connect your GitHub** account
3. **Create a new GitHub repository** and push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/multiplayer-pixel-art.git
   git push -u origin main
   ```
4. **Create new Web Service** on Render
5. **Connect your repository**
6. Render will auto-detect settings from `render.yaml`
7. **Deploy** (takes 2-3 minutes)
8. **Get your URL** (e.g., `https://multiplayer-pixel-art-xyz.onrender.com`)

**Pros:** Free, automatic HTTPS, easy setup
**Cons:** May sleep after 15 minutes of inactivity (free tier)

---

## Option 2: Railway (Free Tier)

### Step 1: Deploy to Railway
1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** from GitHub
3. **Connect your repository**
4. **Add environment variable:**
   - `PORT` = `3000`
5. **Deploy automatically**

**Pros:** Always-on (no sleep), fast deployment
**Cons:** Limited free tier hours

---

## Option 3: Heroku (Free Tier Ended, Paid)

### Create Procfile
```
web: node server.js
```

### Deploy Steps
1. **Install Heroku CLI**
2. **Login:** `heroku login`
3. **Create app:** `heroku create your-app-name`
4. **Deploy:** 
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

---

## Option 4: Local Hosting with Ngrok (Quick Test)

### Step 1: Install Ngrok
1. **Download** from [ngrok.com](https://ngrok.com)
2. **Sign up** for free account
3. **Install and authenticate**

### Step 2: Run Locally
```bash
# Terminal 1: Start your server
node server.js

# Terminal 2: Expose to internet
ngrok http 3000
```

### Step 3: Share URL
- **Copy the HTTPS URL** from ngrok (e.g., `https://abc123.ngrok.io`)
- **Share with friends** - they can access your game directly!

**Pros:** Instant setup, no code changes needed
**Cons:** Temporary URL, requires your computer to stay on

---

## Option 5: VPS/Cloud Server (Advanced)

### Providers:
- **DigitalOcean Droplet** ($5/month)
- **AWS EC2** (free tier available)
- **Google Cloud** (free tier available)
- **Linode** ($5/month)

### Setup Steps:
1. **Create Ubuntu server**
2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Upload your code**
4. **Install dependencies:** `npm install`
5. **Install PM2:** `npm install -g pm2`
6. **Start app:** `pm2 start server.js --name pixel-art`
7. **Setup domain** (optional)

---

## 🎯 Recommended Quick Start

### For Immediate Play:
**Use Ngrok** - Takes 2 minutes, works instantly

### For Permanent Hosting:
**Use Render.com** - Free, reliable, proper domain

---

## 🔧 Environment Variables

Make sure these are set in production:
- `PORT` - Provided by hosting platform
- `NODE_ENV=production` (optional)

---

## 🌐 Domain Setup (Optional)

### Custom Domain:
1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Point to your hosting service**
3. **Enable HTTPS** (usually automatic)

### Free Subdomain:
- Most hosting services provide free subdomains
- Example: `your-app.render.com`

---

## 📱 Sharing with Friends

Once deployed, share your URL:
```
🎨 Join my Pixel Art Game!
URL: https://your-app.render.com
Room ID: [Create a room and share the ID]
```

**Tips:**
- Create a room first, then share both URL and Room ID
- Works on phones, tablets, and computers
- Up to 4 players per room
- Chat works in lobby and during drawing

---

## 🚨 Troubleshooting

### Common Issues:
1. **WebRTC connections fail:** Usually works after 30 seconds
2. **App sleeps:** Use Railway or paid hosting for always-on
3. **SSL/HTTPS errors:** Most hosting platforms handle this automatically
4. **Port issues:** Make sure to use `process.env.PORT`

### Logs:
Check your hosting platform's logs for any errors.

---

**Need help?** The code is ready to deploy - just pick your hosting method! 