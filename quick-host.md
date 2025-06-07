# 🚀 Quick Host for Friends (2 Minutes!)

## Option 1: Ngrok (Easiest - Try This First!)

### Step 1: Download Ngrok
1. Go to [ngrok.com](https://ngrok.com)
2. Sign up for free
3. Download ngrok for Windows
4. Extract to your Desktop

### Step 2: Start Your Game
```bash
# In your project folder:
node server.js
```
(Keep this terminal open!)

### Step 3: Make It Public
```bash
# In a NEW terminal/command prompt:
ngrok http 3000
```

### Step 4: Share with Friends
- Copy the **HTTPS URL** from ngrok (looks like: `https://abc123.ngrok-free.app`)
- Send this link to your friends!
- Create a room and share the Room ID

**That's it!** Your friends can now join from anywhere! 🎉

---

## Option 2: Railway (Free, Always Online)

### Super Quick Deploy:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project → Deploy from GitHub repo
4. Connect your GitHub account
5. Push your code to GitHub first:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/pixel-art-game.git
   git push -u origin main
   ```
6. Select your repository on Railway
7. It deploys automatically!
8. Get your permanent URL

---

## 📱 How Friends Join:

1. **Send them your URL**
2. **They open it on phone/computer**
3. **Enter their name**
4. **Use the same Room ID**
5. **Start drawing together!**

The app works on:
- ✅ Phones (iPhone/Android)
- ✅ Tablets (iPad/Android tablets)  
- ✅ Computers (Windows/Mac/Linux)
- ✅ All browsers (Chrome, Safari, Firefox, Edge)

---

## 💡 Pro Tips:

- **Room capacity:** Up to 4 players per room
- **Chat works everywhere:** Lobby + drawing sessions
- **Mobile friendly:** Touch drawing supported
- **No installation needed:** Just share the link!

**Have fun creating pixel art with friends!** 🎨 