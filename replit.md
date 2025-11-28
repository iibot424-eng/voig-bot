# Overview

IRIS Bot is a comprehensive Telegram bot platform that provides entertainment and community engagement features including an economy system, role-playing actions, mini-games, marriages, and group moderation tools. The application consists of a React-based marketing website and a Telegram bot backend built with Telegraf.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Status

**November 28, 2025 (FULLY COMPLETE)**: 🚀 111 RP КОМАНД - ОБЕ ПОЛОВИНЫ ЗАВЕРШЕНЫ!

**ЧАСТЬ 1 - ✅ ЗАВЕРШЕНО:**
- ✅ **111 RP КОМАНД ДОБАВЛЕНО** (все 5 категорий):
  - 🔥 Агрессивные/Боевые (25): выстрелить, ударить, убить, арестовать, зарезать, отравить, взорвать, сжечь и т.д.
  - ❤️ Социальные/Позитивные (20): обнять, поцеловать, выслушать, утешить, похвалить, приготовить_ужин и т.д.
  - 🎭 Эмоции/Реакции (15): засмеяться, заплакать, удивиться, испугаться, разозлиться, закатить_глаза и т.д.
  - 🚀 Действия/Активность (20): побежать, спрятаться, замереть, прилечь, кивнуть, кричать, исчезнуть и т.д.
  - ❄️ Магия/Сверхъестественное (20): заморозить, поджечь, ослепить_вспышкой, воскресить, парить_в_воздухе и т.д.
  - 🛠️ Прочие/Бытовые (11): напоить_чаем, накормить_пирогом, принести_кофе, написать_письмо и т.д.
- ✅ **ТЕКСТОВЫЕ RP КОМАНДЫ** - работают БЕЗ "/" префикса (просто "обнять", "бить" и т.д.)
- ✅ **СИСТЕМА ПРОВЕРКИ ЗВУКОВ ЖИВОТНЫХ** - при трансформации пользователь должен писать звуки животного (мяу, гав, муу, не-не, у-у-у, рррр, писк, рррык), иначе сообщение удаляется
- ✅ **ЛИМИТ ТРАНСФОРМАЦИИ - БЕЗ ДЛЯ ВЛАДЕЛЬЦА** - владелец может трансформироваться бесконечно

**ЧАСТЬ 2 - ✅ ЗАВЕРШЕНО:**
- ✅ **ПРЕМИУМ КОМАНДА /невидимость** - преобразует пользователя в "ПРИЗРАКА" на 2 часа (👻 статус "НЕВИДИМ"):
  - Иммунитет к ВСЕМ RP командам (никто не может воздействовать на невидимого)
  - Иммунитет срабатывает автоматически при попытке RP действия
  - Только для премиум пользователей и владельца
  - Молчаливое игнорирование RP команд (не показывается сообщение об ошибке)
- ✅ **СИСТЕМА /преврати @user животное** - трансформирует ДРУГИХ пользователей:
  - Работает через ответ на сообщение пользователя: /преврати животное
  - Показывает сообщение: "@user преобразился в 🐱 cat!"
  - Применяет те же проверки звуков как и обычная трансформация
  - Владелец может трансформировать людей бесплатно
- ✅ **ПРОВЕРКА НЕВИДИМОСТИ В RP** - при ответе на RP действие:
  - Система проверяет, невидим ли целевой пользователь
  - Если невидим - RP действие молча игнорируется (не отправляется)
  - Иммунитет работает со всеми 111 RP командами
- ✅ **ВЛАДЕЛЕЦ БЕЗ ЛИМИТОВ ВО ВСЕ КОМАНДАХ:**
  - /daily - БЕЗ кулдауна 24 часов (владелец может брать бонус сколько угодно)
  - /weekly - БЕЗ кулдауна 7 дней (премиум бонус на любое количество раз)
  - /transform - БЕЗ кулдауна 24 часов (владелец может трансформироваться сколько угодно)
  - /transform - БЕЗ СТОИМОСТИ 500⭐ (владелец трансформируется бесплатно, видно "БЕСПЛАТНО (ВЛАДЕЛЕЦ)")
  
- ✅ БД РАСШИРЕНА:
  - isInvisible (boolean) - статус невидимости
  - invisibilityUntil (timestamp) - до когда длится невидимость
  - lastAnimalSoundAt (timestamp) - отслеживание звуков животных
- ✅ PREMIUM SYSTEM: 200 звёзд = премиум, 10 звёзд = 10k валюты
- ✅ Еженедельный бонус 10,000 пойнтов для премиум пользователей (БЕЗ ЛИМИТОВ ДЛЯ ВЛАДЕЛЬЦА)
- ✅ Владелец (@n777snickers777) имеет ПОЛНЫЙ ДОСТУП ко ВСЕМУ без каких-либо ограничений
- ✅ БОТ РАБОТАЕТ НА ПОРТУ 5000 И ПОЛНОСТЬЮ ОПЕРАЦИОНАЛЕН

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

**Rationale**: Separating the bot logic from the web server allows independent scaling and clearer separation of concerns.

**Bot Command Categories:**
- **Economy**: balance, daily, pay, top_rich, rich_history
- **Games**: roll, dice, slots, duel, fish, rock-paper-scissors
- **Social**: marry, accept_marry, divorce, dating, breakup
- **RP Actions**: hug, kiss, hit, pat, slap
- **Transformations**: transform (animals with 4-hour duration)
- **Moderation**: ban, kick, warn (with admin checks)
- **Owner Commands**: broadcast, manage economy (hardcoded owner ID)
- **Profiles**: profile, level, reputation

## Data Storage

The application uses **PostgreSQL** as its database with:
- **Drizzle ORM** for type-safe database queries and schema management
- **Neon serverless PostgreSQL** as the database provider
- Connection pooling via `@neondatabase/serverless` with fetch caching enabled

**Database Schema** (defined in `shared/schema.ts`):
- `users` - Telegram user profiles with economy data (balance, reputation, premium status, transformations)
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

**Alternative Considered**: SQLite was considered for simplicity but rejected due to limited concurrent write support needed for a multi-user bot.

## Build System

The application uses a **custom build script** (`script/build.ts`) that:
1. Clears the `dist/` directory
2. Builds the React frontend with Vite
3. Bundles the Node.js backend with esbuild
4. Creates a single production artifact

**Bundling Strategy**: 
- Selected dependencies (listed in allowlist) are bundled to reduce `openat(2)` syscalls
- Improves cold start performance in serverless/container environments
- External dependencies are kept external to reduce bundle size

## Authentication and Authorization

**Bot Owner Privileges**: 
- Hardcoded bot owner ID (`BOT_OWNER_ID = 7977020467`)
- Owner has access to admin dashboard and special bot commands (broadcast, economy management)
- No formal authentication system implemented for web interface

**User Identification**: Users are identified by their Telegram ID, with automatic user creation on first interaction.

**Rationale**: Since this is a Telegram bot, authentication is delegated to Telegram's platform. Users cannot impersonate each other as Telegram IDs are verified by the platform.

## Type Safety

The application uses **TypeScript** throughout with:
- Shared types in `shared/` directory accessible to both frontend and backend
- Path aliases configured (`@/`, `@shared/`, `@assets/`) for clean imports
- Zod schemas generated from Drizzle schema for runtime validation

**Rationale**: Shared types between frontend and backend prevent API contract mismatches and improve refactoring safety.

# External Dependencies

## Third-Party Services

### Neon Database
- **Purpose**: Serverless PostgreSQL database hosting
- **Configuration**: Via `DATABASE_URL` environment variable
- **Integration**: Connected via `@neondatabase/serverless` package with HTTP protocol and connection pooling

### Telegram Bot API
- **Purpose**: Bot platform for user interaction
- **Configuration**: Via `TELEGRAM_BOT_TOKEN` environment variable
- **Integration**: Telegraf framework handles webhook/polling setup

## UI Component Libraries

- **Radix UI**: Headless UI primitives for accessibility
- **Shadcn/ui**: Pre-styled components built on Radix
- **Lucide React**: Icon library
- **Framer Motion**: Animation library for interactive UI elements

## Development Tools

### Replit Integration
- `@replit/vite-plugin-cartographer`: Code navigation in Replit IDE
- `@replit/vite-plugin-dev-banner`: Development environment banner
- `@replit/vite-plugin-runtime-error-modal`: Enhanced error reporting

### Build Tools
- **esbuild**: Backend bundler for fast production builds
- **Vite**: Frontend bundler with HMR for development
- **Drizzle Kit**: Database migration tool
- **PostCSS/Autoprefixer**: CSS processing pipeline

## Fonts
- Google Fonts (Orbitron, Rajdhani, Inter) loaded via CDN for the cyberpunk theme

**Rationale**: The combination of these dependencies provides a modern development experience with strong type safety, accessibility, and performance optimization while maintaining a relatively small production bundle.

# Deployment Notes

**For Render Deployment:**
1. Set environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `NODE_ENV`: production

2. Run build command: `npm run build`

3. Start command: `npm run start`

4. Ensure port 5000 is exposed for the Express server

**Connection Pooling**: The bot uses Neon's connection pooling with fetch caching to handle multiple concurrent requests efficiently. This is essential for handling high-volume bot interactions.
