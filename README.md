# 🤖 VOIG BOT - Comprehensive Telegram Bot

A feature-rich Telegram bot with 130+ commands including economy system, role-playing actions, premium features, marriages, and group moderation tools.

## ✨ Features

### 💰 Economy System
- Daily/weekly bonuses
- Money transfer between users
- Casino and fishing mini-games
- Rich user rankings
- Duel system with betting

### 🎭 Role-Playing (111+ Commands)
- Combat actions (убить, ударить, выстрелить, зарезать, etc.)
- Social interactions (обнять, целовать, танец, комплимент, etc.)
- Magic spells (заморозить, молния, проклятие, исцелить, etc.)
- Transformations into animals with sound effects
- Full Russian language support

### 💍 Social Features
- Marriage system
- Dating relationships
- Breakups and divorces

### 💎 Premium System
- 200⭐ monthly subscription (Telegram Stars)
- Invisibility mode (2-hour cooldown)
- Transformation protection (400⭐)
- Custom nickname prefixes (10,000⭐)
- Increased daily bonuses

### 🛡️ Admin & Moderation
- Ban/warn users
- Restrict media (video, photos, stickers)
- Owner-only commands
- Group settings

### 📢 Broadcasting
- Owner-only announcement system
- Automatic message broadcasting to all groups
- Auto-tracking of bot presence in groups

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Bot Framework:** Telegraf
- **Database:** PostgreSQL with Drizzle ORM
- **Frontend:** React, Vite, Tailwind CSS, Shadcn/UI
- **Payments:** Telegram Stars integration
- **Deployment:** Replit-ready

## 📋 Requirements

- Node.js 18+
- PostgreSQL database
- Telegram Bot Token
- Environment variables:
  - `DATABASE_URL` - PostgreSQL connection string
  - `TELEGRAM_BOT_TOKEN` - Your Telegram bot token

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/voig-bot.git
cd voig-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file with:
DATABASE_URL=your_postgres_url
TELEGRAM_BOT_TOKEN=your_bot_token
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the bot:
```bash
npm run dev
```

## 📚 Available Commands

### Economy
- `/balance` - Show balance
- `/daily` - Get daily bonus (500⭐ or 1000⭐ premium)
- `/weekly` - Get weekly bonus (5000⭐ premium only)
- `/pay @user amount` - Send money
- `/top_rich` - Top 10 richest users
- `/duel @user amount` - Start a duel

### Games
- `/roll` - Roll dice
- `/dice` - Flip coin
- `/slots` - Slot machine (50⭐)
- `/fish` - Fishing (5/day limit)
- `/casino bet` - Casino game

### Premium
- `/buy_premium` - Buy premium (200⭐)
- `/gift_premium @user` - Gift premium
- `/invisibility` - Be invisible for 2 hours
- `/transform @user` - Transform user into animal

### Profile
- `/profile` - Show profile
- `/prefix text` - Set custom prefix (10,000⭐)

### Moderation
- `/ban @user` - Ban user (admin only)
- `/warn @user` - Warn user (admin only)
- `/no_video` - Forbid videos
- `/no_photo` - Forbid photos
- `/no_sticker` - Forbid stickers
- `/allow_all` - Allow all media

### Owner Only
- `денги` - Give yourself 9,999,999⭐
- `обявление message` - Broadcast announcement to all groups
- `/give_premium @user` - Give premium free

### RP Actions (111+ commands)
Text-based RP actions (respond to a message):
- **Combat:** убить, ударить, выстрелить, зарезать, отравить, взорвать, сжечь, задушить, толкнуть, пнуть, связать, арестовать, обезглавить, расстрелять
- **Social:** обнять, целовать, поцеловать, погладить, улыбнуться, подмигнуть, пожать, утешить, похвалить, танец, комплимент, ужин, цветы, рассказать, серенада
- **Emotions:** смеяться, плакать, вздохнуть, нахмуриться, удивиться, испугаться, разозлиться, восхититься, возмутиться, усмехнуться
- **Magic:** заморозить, поджечь, ослепить, шокировать, молния, проклятие, снять, исцелить, воскресить, прочитать

## 📊 Database Schema

- `users` - User profiles with economy data, transformations, premium status
- `marriages` - Marriage relationships
- `relationships` - Dating relationships
- `duels` - PvP duel records
- `chats` - Telegram group information
- `warnings` - Moderation warnings
- `premiumPurchases` - Premium subscription history
- `currencyPurchases` - Currency purchase history

## 📁 Project Structure

```
.
├── server/
│   ├── bot.ts - Main bot logic with 130+ commands
│   ├── index.ts - Express server and bot initialization
│   ├── db.ts - Database connection
│   └── storage.ts - Storage interface
├── shared/
│   └── schema.ts - Database schema with Drizzle ORM
├── client/
│   └── src/ - React frontend
├── package.json
└── README.md
```

## 🌐 Deployment

### Replit (Recommended - 1 Click)
1. Fork this repository to Replit
2. Set environment variables in Secrets
3. Run `npm run dev`
4. Click "Publish" in top-right for live URL

### Other Platforms (Render, Railway, VPS)
```bash
npm run build
npm start
```

Set environment variables:
- `DATABASE_URL` - Your PostgreSQL URL
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `NODE_ENV` - Set to `production`

## 🔧 Configuration

### Owner Setup
Update the owner ID in `server/bot.ts`:
```typescript
const BOT_OWNER_ID = 7977020467; // Change to your Telegram ID
```

### Bot Commands
All bot commands are automatically set on startup. The bot supports both:
- Slash commands: `/start`, `/balance`, etc.
- Text commands: `баланс`, `профиль`, etc.

## 🎯 Key Features in Detail

### Auto-Chat Tracking
- Bot automatically saves all groups it joins
- Auto-save on first message (fallback)
- Tracks additions/removals with `my_chat_member` handler

### Broadcasting System
- Owner can send announcements with `обявление`
- Real-time statistics on delivery
- Automatic error handling for kicked/restricted bots

### Transform System
- 111 different animals
- Animal-specific sounds
- 24-hour cooldown (except owner)
- Permanent protection option (400⭐)

### Economy Balance
- New users: 1,000⭐
- Daily bonus: 500⭐ (1,000⭐ premium)
- Weekly bonus: 5,000⭐ (premium)
- Casino: 1.5x multiplier
- Fishing: Random 50-500⭐

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For questions and issues:
1. Open an issue on GitHub
2. Check existing documentation
3. Review bot logs for debugging

---

**Made with ❤️ for Telegram Community**

Last Updated: November 30, 2025
Bot Status: ✅ 100% Production Ready
