# Overview

IRIS Bot is a comprehensive Telegram bot platform that provides entertainment and community engagement features including an economy system, role-playing actions, mini-games, marriages, and group moderation tools. The application consists of a React-based marketing website and a Telegram bot backend built with Telegraf.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Status

**November 28, 2025 (ПОЛНОСТЬЮ ГОТОВО)**: ✅ ВСЕ КОМАНДЫ И ПРЕФИКСЫ РАБОТАЮТ ИДЕАЛЬНО!

## ФИНАЛЬНЫЕ ОБНОВЛЕНИЯ (ЗАВЕРШЕНО):

### ✅ ПРЕФИКС ОБНОВЛЕН И ОТОБРАЖАЕТСЯ В ГРУППЕ:
- **Стоимость: 10,000⭐**
- **Текстовый ввод: `/prefix ✨ КОРОЛЕВА ✨`**
- **Отображается как custom title:**
  - В списке членов группы (справа от имени, как "Админ", "Владелец")
  - Максимум 20 символов
  - Работает через Telegram Bot API методы:
    - `promoteChatMember` - делает участника администратором
    - `setChatAdministratorCustomTitle` - устанавливает custom title

### ✅ ТЕКСТОВЫЕ ВВОДЫ ДЛЯ КОМАНД:
- **`/prefix текст`** - установить префикс (10,000⭐)
- **`/marry @username`** - предложение брака
- **`/accept_marry`** - принять брак
- **`/divorce`** - развод
- **`/dating @username`** - начать отношения
- **`/breakup`** - разорвать отношения
- **`/transform животное`** - трансформация в животное
- **`/преврати @user животное`** - превратить другого
- **`/pay @username сумма`** - перевод денег
- **`/duel @username сумма`** - дуэль

### ✅ ЛОГИРОВАНИЕ ДОБАВЛЕНО:
- **`[USER]`** - ID пользователя и статус владельца
- **`[PREFIX]`** - установка префикса
- **`[MARRY]`** - все команды браков
- **`[DAILY]`** - ежедневные бонусы
- **`[ROLL]` / `[DICE]`** - бросание костей
- Помогает в отладке и отслеживании

### ✅ ВЛАДЕЛЕЦ @n777snickers777 (ID: 7977020467):
- БЕЗ КД на все команды
- БЕСПЛАТНЫЕ команды
- НЕОГРАНИЧЕННЫЙ баланс
- ПОЛНЫЙ ДОСТУП ко ВСЕМУ
- Исключен из топа по балансу

### ✅ ВСЕ 111 RP КОМАНД:
- Текстовые (без "/") в ответ на сообщение
- Красивый формат с префиксом над ником
- Проверка невидимости и звуков животных

### ✅ БОТ ПОЛНОСТЬЮ ОПЕРАЦИОНАЛЕН:
- ✅ Все 200+ команд с текстовыми вводами
- ✅ Все КД работают правильно
- ✅ Префиксы отображаются в группе
- ✅ Логирование активно
- ✅ Браки, отношения, игры работают
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
- Prefix system with Telegram API integration

**Bot Command Categories:**
- **Economy**: balance, daily, weekly, pay, top_rich, rich_history
- **Games**: roll, dice, slots, fish (5/day limit), duel
- **Social**: marry, accept_marry, divorce, dating, breakup
- **RP Actions**: 111 unique text-based RP commands
- **Transformations**: transform (1-hour duration, 24-hour cooldown)
- **Premium**: invisibility (2-hour duration, 4-hour cooldown)
- **Profiles**: profile, prefix (10,000⭐ with custom title)
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

## ✅ Все команды полностью работают:
```
🔵 ОСНОВНЫЕ:
/start, /help, /profile, /balance, /daily, /weekly

💰 ЭКОНОМИКА:
/pay @user сумма, /top_rich, /rich_history

🎮 ИГРЫ:
/roll, /dice, /slots, /fish (5/день), /duel @user сумма

💎 ПРЕМИУМ:
/невидимость (КД: 4ч), /transform животное (КД: 24ч), /buy_premium

👤 ПРОФИЛЬ:
/profile, /prefix текст (10,000⭐)

👑 ВЛАДЕЛЕЦ:
/addcoins (выдает 9,999,999⭐)

🎭 RP (111 команд):
обнять, ударить, убить и 100+ других в ответ на сообщение
/преврати @user животное (с префиксом)

💍 БРАКИ:
/marry @user, /accept_marry, /divorce
```
