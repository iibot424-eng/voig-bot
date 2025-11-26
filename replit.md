# Telegram Bot - Многофункциональный бот для управления чатами

## Обзор

Многофункциональный Telegram бот с 100+ командами, системой модерации, играми, внутренней валютой (звёзды) и системой подписок.

## Владелец

@n777snickers777 - полный доступ ко всем функциям бота

## Технологии

- **Framework**: Mastra (TypeScript)
- **База данных**: PostgreSQL
- **Обработка событий**: Inngest
- **Триггер**: Telegram Webhook

## Структура проекта

```
src/
├── mastra/
│   ├── agents/
│   │   └── telegramBotAgent.ts    # Агент бота
│   ├── tools/
│   │   ├── botCommands.ts         # Все 100+ команд бота
│   │   └── database.ts            # Функции работы с БД
│   ├── workflows/
│   │   └── telegramBotWorkflow.ts # Workflow обработки сообщений
│   ├── storage/
│   │   └── index.ts               # PostgreSQL storage
│   └── index.ts                   # Главный файл Mastra
├── triggers/
│   └── telegramTriggers.ts        # Обработчик Telegram webhook
```

## Таблицы базы данных

- `bot_users` - Пользователи (звёзды, репутация, уровень, био, префикс)
- `bot_chats` - Чаты (настройки, приветствия, правила, лимиты)
- `global_users` - Глобальные пользователи (владельцы, премиум)
- `warnings` - Предупреждения
- `temp_restrictions` - Временные баны/муты
- `blacklist_words` - Чёрный список слов
- `subscriptions` - Подписки
- `shop_prefixes` - Магазин префиксов
- `user_prefixes` - Купленные префиксы
- `message_stats` - Статистика сообщений
- `star_transactions` - Транзакции звёзд
- `reputation_history` - История репутации
- `reports` - Жалобы
- `payments` - Платежи

## Основные команды

### Модерация (25 команд)
/ban, /softban, /tempban, /unban, /mute, /tempmute, /unmute, /ro, /unro
/warn, /unwarn, /warns, /resetwarns, /warnlimit
/kick, /kickme, /restrict, /unrestrict
/antispam, /flood, /blacklist, /whitelist, /caps, /links, /badwords

### Информация и статистика (20 команд)
/info, /id, /whois, /profile, /users, /admins, /mods
/chat_info, /stats, /top_activity, /top_warns, /my_stats, /user_count, /message_count
/rank, /level, /leaderboard, /reputation, /rep_top, /award

### Настройки чата (15 команд)
/set_welcome, /set_rules, /rules, /set_goodbye, /welcome
/set_lang, /log_channel, /report_channel, /auto_delete, /clean_service
/media_limit, /sticker_limit, /gif_limit, /voice_limit, /forward_limit

### Команды пользователей (15 команд)
/report, /compliment, /thank, /rep, /marry
/me, /bio, /afk, /back, /bonus
/karma, /gift, /hug, /coin, /random

### Развлечения (15 команд)
/roll, /dice, /casino, /slot, /guess
/quiz, /trivia, /test, /compat, /rate
/joke, /fact, /quote, /cat, /dog

### Администрирование (10 команд)
/promote, /demote, /adminlist, /modlist
/clean, /clean_all, /pin, /unpin, /invite, /backup

### Экономика
/stars, /balance, /shop, /buy, /prefixes, /setprefix
/premium, /givepremium (владелец), /givestars (владелец), /transfer

## Монетизация

- **Внутренняя валюта**: Звёзды ⭐
- **Ежедневный бонус**: 50-100 звёзд (/bonus)
- **Магазин префиксов**: 15 префиксов (250-1000 звёзд)
- **Премиум подписка**: 200₽/месяц

## Настройка Webhook

После публикации бота, установите webhook:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/webhooks/telegram/action
```

## Изменения

### 2025-11-26
- Создан многофункциональный Telegram бот
- Реализовано 100+ команд
- Добавлена система модерации с временными банами/мутами
- Создана система внутренней валюты (звёзды)
- Добавлен магазин префиксов (15 префиксов)
- Реализована система репутации и уровней
- Добавлены игры: казино, слоты, кости, викторины
- Создана система приветствий и правил чата
- Добавлен антиспам: фильтры слов, контроль флуда, блокировка ссылок
