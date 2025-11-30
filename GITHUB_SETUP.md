# 🚀 GitHub Setup Instructions

## How to Push to GitHub

### 1. Create a GitHub Repository
1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `voig-bot`
3. Do NOT initialize with README (we already have one)
4. Copy the repository URL

### 2. Push Your Code

From terminal (Replit or local machine):

```bash
# Add GitHub as remote
git remote add origin https://github.com/yourusername/voig-bot.git

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: VOIG BOT - Telegram bot with 130+ commands"

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Environment Variables

When deploying, set these environment variables:

**On Replit:**
- Go to Tools > Secrets
- Add `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- Add `DATABASE_URL` - Your PostgreSQL connection string

**On other platforms (Render, Railway, etc.):**
- Set environment variables in deployment dashboard

### 4. Get Your Telegram Bot Token

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy the token (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 5. Get PostgreSQL Database

**Option A: Replit Built-in (Easiest)**
- Replit provides free PostgreSQL
- DATABASE_URL is automatically set

**Option B: External Services**
- [Railway.app](https://railway.app) - Free tier available
- [Render.com](https://render.com) - Free tier available
- [Neon.tech](https://neon.tech) - Serverless Postgres

### 6. Deploy

**On Replit:**
1. Fork this repo to Replit
2. Set secrets (TELEGRAM_BOT_TOKEN, DATABASE_URL)
3. Click "Run" to start bot
4. Click "Publish" for live URL

**On Railway.app:**
```bash
npm install -g railway
railway link
railway up
```

**On Render.com:**
1. Connect GitHub repository
2. Set environment variables
3. Deploy

### 7. Test Your Bot

In Telegram:
1. Find your bot (search by name)
2. Start chat: `/start`
3. Try commands: `/balance`, `/profile`, etc.

### 8. Make Owner

Edit `server/bot.ts`:
```typescript
const BOT_OWNER_ID = YOUR_TELEGRAM_ID; // Change to your ID
```

Get your ID: Use `/id` command with the bot

---

## Useful Commands

```bash
# Check status
git status

# View commits
git log --oneline -5

# Add files
git add .

# Create commit
git commit -m "Your message"

# Push changes
git push origin main

# Pull updates
git pull origin main
```

---

**Happy coding! 🎉**
