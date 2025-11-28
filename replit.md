# Overview

IRIS Bot is a comprehensive Telegram bot platform that provides entertainment and community engagement features including an economy system, role-playing actions, mini-games, marriages, and group moderation tools. The application consists of a React-based marketing website and a Telegram bot backend built with Telegraf.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Status

**November 28, 2025 (ПОЛНОСТЬЮ ЗАВЕРШЕНО)**: ✅ ВСЕ КОМАНДЫ РАБОТАЮТ ИДЕАЛЬНО!

## ФИНАЛЬНЫЕ ИСПРАВЛЕНИЯ (ЗАВЕРШЕНО):

### ✅ ПРЕФИКС ОБНОВЛЕН:
- **Стоимость: 10,000⭐** (было 100⭐)
- Показывается где "АДМИН/ВЛАДЕЛЕЦ" в Телеграме:
  - Пользовательский префикс: `✨ КОРОЛЕВА ✨ @username`
  - Владелец: `👑 ВЛАДЕЛЕЦ 👑 @username`
  - Премиум: `✨ ПРЕМИУМ ✨ @username`
  - Обычный: `@username`
- Максимум 20 символов
- Отображается в профиле и всех RP командах

### ✅ НОВАЯ КОМАНДА ВЛАДЕЛЬЦА:
- **`/addcoins`** - выдает 9,999,999 монет владельцу
  - Только для владельца (@n777snickers777)
  - Сбрасывает баланс на 9,999,999⭐

### ✅ ВЛАДЕЛЕЦ ИСКЛЮЧЕН ИЗ ТОПА:
- `/top_rich` больше НЕ показывает владельца
- Топ начинается со второго места по балансу
- Владелец имеет НЕОГРАНИЧЕННЫЙ баланс

### ✅ КД И ВРЕМЕНА ДЕЙСТВИЯ:
- **`/невидимость`** 👻
  - КД: 4 часа между использованиями
  - Действует: 2 часа
  - ТОЛЬКО для премиум + владелец
  - Владелец БЕЗ КД

- **`/transform животное`**
  - КД: 24 часа между использованиями
  - Действует: 1 час
  - Стоит: 500⭐ (владелец БЕСПЛАТНО)
  - Владелец БЕЗ КД

- **`/преврати @user животное`**
  - КД: 24 часа между использованиями
  - Работает через ответ на сообщение
  - Владелец БЕЗ КД и БЕЗ ограничений

### ✅ ВСЕ 111 RP КОМАНД:
- Красивый формат с префиксом над ником
- Проверка невидимости (молчаливое игнорирование)
- Проверка звуков животных при трансформации

### ✅ ЛОГИРОВАНИЕ:
- ID пользователя логируется при каждой команде
- Статус владельца отмечается
- Помогает в отладке

### ✅ ВЛАДЕЛЕЦ @n777snickers777 (ID: 7977020467):
- БЕЗ КД на ВСЕ команды
- БЕСПЛАТНАЯ трансформация
- Может превращать людей БЕЗ КД
- НЕОГРАНИЧЕННЫЙ баланс
- ПОЛНЫЙ ДОСТУП ко ВСЕМУ

### ✅ БОТ ПОЛНОСТЬЮ ОПЕРАЦИОНАЛЕН:
- ✅ Все 200+ команд работают
- ✅ Все КД функционируют правильно
- ✅ Владелец имеет полный контроль
- ✅ БД синхронизирована идеально
- ✅ Логирование активно
- ✅ Запущен на порту 5000

---

# System Architecture

## Frontend Architecture

The frontend is a **React single-page application (SPA)** built with:
- **Vite** as the build tool and development server
- **React Router (Wouter)** for client-side routing
- **TanStack Query** for server state management
- **Tailwind CSS** for styling with a cyberpunk/dark future theme
- **Shadcn/ui** component library with Radix UI primitives

The application follows a component-based architecture with:
- Pages in `client/src/pages/` (Home, Dashboard, NotFound)
- Reusable UI components in `client/src/components/ui/`
- Layout components in `client/src/components/layout/`
- Feature-specific components in `client/src/components/home/`

**Design Pattern**: The frontend uses a presentational/container component pattern with hooks for state management and side effects.

## Backend Architecture

The backend follows a **monolithic Node.js architecture** with two distinct services:

### Express Web Server
- Serves the static React build in production
- Uses Vite middleware in development for HMR
- Provides API routes (currently minimal, extensible via `/api` prefix)
- Handles HTTP logging and error handling

**Rationale**: Express provides a simple, well-established foundation for serving the SPA and potential API endpoints.

### Telegram Bot Service
- Built with **Telegraf** framework for Telegram Bot API interaction
- Implements 200+ bot commands and handlers in `server/bot.ts`
- Runs independently alongside the Express server
- All text responses in Russian
- Comprehensive logging for debugging

**Rationale**: Separating the bot logic from the web server allows independent scaling and clearer separation of concerns.

**Bot Command Categories:**
- **Economy**: balance, daily, weekly, pay, top_rich, rich_history
- **Games**: roll, dice, slots, fish (5/day limit), duel, rock-paper-scissors
- **Social**: marry, accept_marry, divorce, dating, breakup
- **RP Actions**: 111 unique text-based RP commands (обнять, ударить, убить, etc.)
- **Transformations**: transform (1-hour duration, 24-hour cooldown)
- **Premium**: invisibility (2-hour duration, 4-hour cooldown)
- **Profiles**: profile, prefix (custom nick prefix for 10,000⭐)
- **Owner Commands**: addcoins, broadcast, manage economy (hardcoded owner ID)

## Data Storage

The application uses **PostgreSQL** as its database with:
- **Drizzle ORM** for type-safe database queries and schema management
- **Neon serverless PostgreSQL** as the database provider
- Connection pooling via `@neondatabase/serverless` with fetch caching enabled

**Database Schema** (defined in `shared/schema.ts`):
- `users` - Telegram user profiles with economy data (balance, reputation, premium status, transformations, invisibility status, fish count, nick prefix, etc.)
- `marriages` - User marriage relationships with timestamps
- `relationships` - Dating relationships between users
- `pendingProposals` - Marriage/relationship proposals with expiration times
- `duels` - PvP duel records with results
- `chats` - Telegram chat/group information
- `warnings` - User moderation warnings with issuer tracking

**Rationale**: 
- PostgreSQL provides ACID compliance for financial transactions in the economy system
- Drizzle was chosen for type safety and better DX compared to raw SQL
- Neon's serverless model reduces cold start times and provides automatic scaling
- Connection pooling with fetch caching solves concurrent connection limits

## Build System

The application uses a **custom build script** (`script/build.ts`) that:
1. Clears the `dist/` directory
2. Builds the React frontend with Vite
3. Bundles the Node.js backend with esbuild
4. Creates a single production artifact

## Authentication and Authorization

**Bot Owner Privileges**: 
- Hardcoded bot owner ID (`BOT_OWNER_ID = 7977020467` for @n777snickers777)
- Owner has unlimited access to ALL commands without cooldowns
- Owner can use premium features without payment
- Owner excluded from balance rankings
- Owner can execute `/addcoins` to get 9,999,999⭐
- No formal authentication system implemented for web interface

**User Identification**: Users are identified by their Telegram ID, with automatic user creation on first interaction.

## Type Safety

The application uses **TypeScript** throughout with:
- Shared types in `shared/` directory accessible to both frontend and backend
- Path aliases configured (`@/`, `@shared/`, `@assets/`) for clean imports
- Zod schemas generated from Drizzle schema for runtime validation

# Commands Summary

## ✅ Все команды полностью работают:
```
🔵 ОСНОВНЫЕ:
/start, /help, /profile, /balance, /daily, /weekly

💰 ЭКОНОМИКА:
/pay @user сумма, /top_rich (без владельца), /rich_history

🎮 ИГРЫ:
/roll, /dice, /slots, /fish (5/день), /duel

💎 ПРЕМИУМ:
/невидимость (КД: 4ч), /transform (КД: 24ч), /buy_premium

👤 ПРОФИЛЬ:
/profile (с префиксом), /prefix текст (10,000⭐)

👑 ВЛАДЕЛЕЦ:
/addcoins (выдает 9,999,999⭐)

🎭 RP (111 команд):
обнять, ударить, убить и 100+ других в ответ на сообщение
/преврати @user животное (с префиксом)

💍 БРАКИ:
/marry, /accept_marry, /divorce
```
