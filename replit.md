# Overview

IRIS Bot is a comprehensive Telegram bot platform that provides entertainment and community engagement features including an economy system, role-playing actions, mini-games, marriages, and group moderation tools. The application consists of a React-based marketing website and a Telegram bot backend built with Telegraf.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Status

**November 30, 2025 (Updated - Part 4)**: ✅ БОТ 100% ЗАВЕРШЕН! Добавлена команда объявлений для владельца!

## Последние обновления (Объявления + Исправления):

### ✅ Исправлено переподключение при разрыве соединения:
- Проверка соединения каждые **10 сек** (вместо 30)
- Быстрое переподключение за **2-3 сек** (вместо 3-5)
- Улучшено отслеживание состояния бота
- Автоматическое восстановление при разрыве
- Бот теперь НЕ разрывает соединение при выходе на 10 сек из Replit

### ✅ Добавлена обработка текстовой команды `/prefix`:
- `prefix текст` - установить префикс (10,000⭐)
- `префикс текст` - установить префикс (10,000⭐)
- Работает как текстовая команда (без "/")

### ✅ Админ команды в списке:
- `/ban` - забанить пользователя (только админы)
- `/warn` - выдать предупреждение (только админы)
- `/no_video` - запретить видео в чате
- `/no_photo` - запретить фото в чате
- `/no_sticker` - запретить стикеры в чате
- `/allow_all` - разрешить всё медиа в чате

### ✅ Префикс для всех!
- `/prefix текст` - установить префикс за **10,000⭐**
- Доступен всем пользователям (не только премиум)
- Все могут иметь свой уникальный префикс

### ✅ Премиум стакирование:
- Исправлено стакирование премиума в `/give_premium` (владелец)
- Все команды премиума теперь работают одинаково:
  - `/buy_premium` - 200⭐ (стакирует ✅)
  - `/gift_premium` - 200⭐ подарок (стакирует ✅)
  - `/give_premium` - владелец бесплатно (стакирует ✅)

### ✅ Исправлены команды со слешем:
- Удален дублирующийся `bot.on('text')` обработчик
- Команды `/start`, `/help`, `/balance` и другие со слешем теперь работают ✅
- Текстовые команды без слеша продолжают работать ✅

### ✅ Добавлена команда рассылки объявлений:
- `обявление сообщение` - отправить объявление по всем чатам (только владелец)
- Автоматическое отслеживание всех чатов, в которых есть бот
- При добавлении бота в чат - автоматически сохраняется в БД ✅
- При удалении бота из чата - автоматически удаляется из БД ✅
- Показывает статистику: сколько отправлено, сколько ошибок

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
- **Auto-reconnection on connection failure** (10 sec check interval, 2-3 sec reconnect)
- Both "/" commands and text-based commands supported

**Bot Command Categories:**
- **Economy**: balance, daily, weekly, pay, top_rich, rich_history
- **Games**: roll, dice, slots, fish (5/day limit), duel
- **Social**: marry, accept_marry, divorce, dating, breakup
- **RP Actions**: 111 unique text-based RP commands with animal sounds
- **Transformations**: transform (1-hour duration, 24-hour cooldown) with sound feedback
- **Premium**: invisibility (2-hour duration, 4-hour cooldown), premium features
- **Payments**: Telegram Stars payment integration with premium support
- **Profiles**: profile, prefix (10,000⭐ for everyone)
- **Admin/Moderation**: ban, warn, no_video, no_photo, no_sticker, allow_all
- **Owner Commands**: addcoins (9,999,999⭐), give_premium

## Data Storage

The application uses **PostgreSQL** with:
- **Drizzle ORM** for type-safe queries
- **Neon serverless PostgreSQL** as provider
- Connection pooling with fetch caching

**Database Schema:**
- `users` - profiles with economy, transformations, invisibility, nick prefix, premium status
- `marriages` - marriage relationships
- `relationships` - dating relationships
- `pendingProposals` - marriage/relationship proposals
- `duels` - PvP duel records
- `chats` - Telegram group information
- `warnings` - moderation warnings
- `premiumPurchases` - premium subscription history
- `currencyPurchases` - currency purchase history

---

# Commands Summary

## Основные команды:
- `/start`, `/help`, `/profile`, `/balance`, `/daily`, `/weekly`

## Экономика:
- `/pay @user сумма`, `/top_rich`, `/rich_history`

## Игры:
- `/roll`, `/dice`, `/slots`, `/fish` (5/день), `/duel @user сумма`

## Премиум:
- `/invisibility` (КД: 4ч), `/transform @user` (КД: 24ч), `/buy_premium` (200⭐)

## Профиль:
- `/profile`, `/prefix текст` (10,000⭐)

## Админ/Модерация:
- `/ban @user` - забанить (только администраторы)
- `/warn @user` - предупреждение (только администраторы)
- `/no_video` - запретить видео (для группы)
- `/no_photo` - запретить фото (для группы)
- `/no_sticker` - запретить стикеры (для группы)
- `/allow_all` - разрешить всё (для группы)

## Владелец (@n777snickers777 / KLABA):
- `/addcoins` - выдает 9,999,999⭐
- `/give_premium @user` - выдать премиум бесплатно

## RP (111 команд):
- обнять, ударить, убить и 100+ других (ответом на сообщение)
- Все команды работают и с "/" и текстом
- Со звуками животных при трансформации
