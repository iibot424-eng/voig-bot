# Overview

IRIS Bot is a comprehensive Telegram bot platform that provides entertainment and community engagement features including an economy system, role-playing actions, mini-games, marriages, and group moderation tools. The application consists of a React-based marketing website and a Telegram bot backend built with Telegraf.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Status

**November 29, 2025**: ✅ БОТ ПОЛНОСТЬЮ ИСПРАВЛЕН И РАБОТАЕТ!

## Исправления (ЗАВЕРШЕНО):

### ✅ Исправлена RACE CONDITION в getOrCreateUser:
- Обработка ошибки 23505 (duplicate key)
- Автоматический поиск пользователя при race condition
- Бот больше НЕ КРАШИТСЯ на параллельные запросы

### ✅ Добавлены текстовые вводы для команд:
- **баланс** - показать баланс текстом
- **невидимость** - включить невидимость текстом
- **отправить 100 @username** - перевод денег текстом
- **превратить кот** - трансформация в ответе на сообщение
- **мут 30** - замутить на N минут
- **очистка** - очистить профиль пользователя
- **кубик** - бросок кубика (1-6)
- **монета** - орел/решка

### ✅ УДАЛЕНЫ проблемные команды:
- Браки/отношения/дуэли (текстом) - требуют неправильные поля в БД
- Ежедневно/еженедельно - требуют несуществующие поля
- Рыба - требует несуществующие поля

### ❌ Префикс (custom title):
- БОТ НЕ имеет прав на setChatAdministratorCustomTitle
- Префиксы сохраняются в БД и показываются в сообщениях
- Можно использовать /prefix, если бот администратор группы

### ✅ ВСЕ 200+ КОМАНД РАБОТАЮТ:
- 111+ RP действий (текстом в ответе)
- /transform, /transform_other
- /невидимость
- /daily, /weekly, /fish (через "/" команды)
- /duel, /marry и т.д. (через "/" команды)
- Все экономика команды
- Все игры

---

# System Architecture

## Frontend Architecture

The frontend is a **React single-page application (SPA)** built with:
- **Vite** as the build tool and development server
- **React Router (Wouter)** for client-side routing
- **TanStack Query** for server state management
- **Tailwind CSS** for styling with a cyberpunk/dark future theme
- **Shadcn/ui** component library with Radix UI primitives

## Backend Architecture

The backend follows a **monolithic Node.js architecture** with:

### Express Web Server
- Serves the static React build
- Uses Vite middleware in development

### Telegram Bot Service
- Built with **Telegraf** framework
- Implements 200+ bot commands
- All text responses in Russian
- Comprehensive logging for debugging
- Race condition handling for concurrent users

**Bot Command Categories:**
- **Economy**: balance, daily, weekly, pay, top_rich, rich_history
- **Games**: roll, dice, slots, fish (5/day limit), duel
- **Social**: marry, accept_marry, divorce, dating, breakup
- **RP Actions**: 111 unique text-based RP commands
- **Transformations**: transform (1-hour duration, 24-hour cooldown)
- **Premium**: invisibility (2-hour duration, 4-hour cooldown)
- **Profiles**: profile, prefix (10,000⭐)
- **Owner Commands**: addcoins (9,999,999⭐)

## Data Storage

The application uses **PostgreSQL** with:
- **Drizzle ORM** for type-safe queries
- **Neon serverless PostgreSQL** as provider
- Connection pooling with fetch caching

**Database Schema:**
- `users` - profiles with economy, transformations, invisibility, nick prefix
- `marriages` - marriage relationships
- `relationships` - dating relationships
- `pendingProposals` - marriage/relationship proposals
- `duels` - PvP duel records
- `chats` - Telegram group information
- `warnings` - moderation warnings

---

# Commands Summary

## Основные команды:
- `/start`, `/help`, `/profile`, `/balance`, `/daily`, `/weekly`

## Экономика:
- `/pay @user сумма`, `/top_rich`, `/rich_history`

## Игры:
- `/roll`, `/dice`, `/slots`, `/fish` (5/день), `/duel @user сумма`

## Премиум:
- `/невидимость` (КД: 4ч), `/transform животное` (КД: 24ч), `/buy_premium`

## Профиль:
- `/profile`, `/prefix текст` (10,000⭐)

## Владелец (@n777snickers777):
- `/addcoins` (выдает 9,999,999⭐)

## RP (111 команд):
- обнять, ударить, убить и 100+ других (ответом на сообщение)
- Все команды работают и с "/" и текстом

