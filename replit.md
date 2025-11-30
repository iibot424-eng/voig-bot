# Overview

IRIS Bot is a comprehensive Telegram bot platform that provides entertainment and community engagement features including an economy system, role-playing actions, mini-games, marriages, and group moderation tools. The application consists of a React-based marketing website and a Telegram bot backend built with Telegraf.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Status

**November 30, 2025 (Updated - Part 2)**: ✅ БОТ 100% ЗАВЕРШЕН И ПОЛНОСТЬЮ РАБОТАЕТ!

## Последние обновления (Финальные):

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

**November 30, 2025 (Earlier Update)**: ✅ БОТ 100% ЗАВЕРШЕН И ПОЛНОСТЬЮ РАБОТАЕТ!

## Более ранние обновления:

### ✅ Модерационные команды (4 новые):
- `запретить видео` - запретить видео в чате
- `запретить фото` - запретить фото в чате
- `запретить стикеры` - запретить стикеры в чате
- `разрешить всё` - разрешить все медиа в чате

### ✅ Автоматическая фильтрация медиа:
- Бот автоматически удаляет запрещённые видео
- Бот автоматически удаляет запрещённые фото
- Бот автоматически удаляет запрещённые стикеры
- Отправляет уведомление при удалении

### ✅ Звуки животных при трансформации:
- При трансформации показывается какой звук издавать
- 🐱 cat → мяу
- 🐕 dog → гав  
- 🐄 cow → муу
- 🦊 fox → не-не
- 🐺 wolf → у-у-у
- 🐻 bear → рррр
- 🐰 rabbit → писк
- 🐯 tiger → рррык

### ✅ Стабильность и отказоустойчивость:
- Добавлена автоматическая переподключение при разрыве соединения
- Бот переподключается через 5 сек при ошибке
- Полная обработка ошибок Telegram API
- Все исключения логируются и обрабатываются

### ✅ Платежная система:
- Исправлена ошибка при открытии платежа
- Добавлено логирование всех платежных операций
- Обработка исключений в платежных операциях
- Полная поддержка Telegram Stars для премиума

### ✅ Трансформированные пользователи могут писать команды:
- Добавлены ВСЕ текстовые команды в список (30+ команд)
- Добавлены ВСЕ 111+ RP команд
- Команды работают БЕЗ ограничений для трансформированных
- Обычные сообщения удаляются если нет звука животного

### ✅ Все 130+ команды показаны в меню Telegram:
- **📋 Все команды** - полный список всех 130+ команд по категориям
- **🔵 Основные** - профиль, экономика, премиум
- **🎮 Игры** - roll, dice, slots, casino, fish, duel
- **🎭 RP** - все 111+ RP команд (боевые, позитив, эмоции, действия, магия)
- **💍 Браки** - marry, accept_marry, divorce со всеми вариантами
- **💎 Премиум** - все премиум команды и бонусы
- **👮 Админ/Модерация** - ban, warn, no_video, no_photo, no_sticker, allow_all
- Плюс 89 официальные команды в Telegram списке

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
- Error handling and auto-reconnection on connection failure

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
