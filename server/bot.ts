import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { users, marriages, duels, relationships, pendingProposals, chats, warnings, businesses, mutes, bans, inventory, premiumPurchases, currencyPurchases } from '@shared/schema';
import { eq, and, or, desc, sql, lt, ne } from 'drizzle-orm';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_OWNER_ID = 7977020467; // @n777snickers777
const BOT_OWNER_USERNAME = "n777snickers777";
const TRANSFORM_COOLDOWN_HOURS = 24;
const TRANSFORM_DURATION_HOURS = 1; // 1 час действует
const INVISIBILITY_COOLDOWN_HOURS = 4; // 4 часа КД
const INVISIBILITY_DURATION_HOURS = 2; // 2 часа действует
const PREMIUM_COST_STARS = 200;
const WEEKLY_BONUS_POINTS = 10000;
const FISH_LIMIT_PER_DAY = 5;

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');

const bot = new Telegraf(BOT_TOKEN);

// Хелперы
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const ANIMALS = ["cat", "dog", "cow", "fox", "wolf", "bear", "rabbit", "tiger"];
const ANIMAL_EMOJIS: Record<string, string> = {
  cat: "🐱", dog: "🐕", cow: "🐄", fox: "🦊", wolf: "🐺", bear: "🐻", rabbit: "🐰", tiger: "🐯"
};
const ANIMAL_SOUNDS: Record<string, string> = {
  cat: "мяу", dog: "гав", cow: "муу", fox: "не-не", wolf: "у-у-у", bear: "рррр", rabbit: "писк", tiger: "рррык"
};

// Получить или создать пользователя
async function getOrCreateUser(ctx: Context) {
  if (!ctx.from) return null;
  const telegramId = ctx.from.id;
  const isOwner_check = isOwner(telegramId);
  console.log(`[USER] ID: ${telegramId}, Username: ${ctx.from.username}, IsOwner: ${isOwner_check}`);
  
  let [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  
  if (!user) {
    try {
      [user] = await db.insert(users).values({
        telegramId, username: ctx.from.username || null, firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null, balance: 1000,
      }).returning();
      console.log(`[USER] Создан новый пользователь ID: ${telegramId}`);
    } catch (e: any) {
      // Race condition - пользователь был создан в другом потоке
      if (e.code === '23505') {
        [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
        console.log(`[USER] Найден после race condition ID: ${telegramId}`);
      } else {
        throw e;
      }
    }
  } else {
    await db.update(users).set({ 
      lastActive: new Date(), username: ctx.from.username || null, firstName: ctx.from.first_name || null,
    }).where(eq(users.id, user.id));
  }
  return user;
}

// Проверка владельца
function isOwner(userId: number): boolean {
  return userId === BOT_OWNER_ID;
}

// RP действия - ВСЕ 111 КОМАНД
const rpActions: Record<string, string> = {
  // 🔥 Агрессивные/Боевые (25)
  выстрелить: "🔫", ударить: "👊", убить: "💀", арестовать: "👮", зарезать: "🔪",
  отравить: "☠️", взорвать: "💣", сжечь: "🔥", задушить: "🤐", толкнуть: "💥",
  пнуть: "🦵", связать: "🔗", запереть: "🔐", подвергнуть_пыткам: "⚔️", закопать: "⛏️",
  обезглавить: "🪓", расстрелять: "🔫🔫", сбросить_с_высоты: "📉", укусить: "🦷", оглушить: "💫",
  обезвредить: "🛡️", разоружить: "🔓", швырнуть_об_стену: "🧱", прижать_к_стене: "📍", наступить_на_ногу: "👞",
  выебать: "🍆", сосать: "🍑", трахать: "🔥", ебать: "💦", лизать: "👅",
  задрочить: "👋", дрочить: "👊", доминировать: "👑", подчиняться: "🔗", приковать: "🔗",
  
  // ❤️ Социальные/Позитивные (20)
  обнять: "🤗", поцеловать: "💋", целовать: "💋", погладить_по_голове: "🤚", улыбнуться: "😊",
  подмигнуть: "😉", пожать_руку: "🤝", выслушать: "👂", утешить: "💙", похвалить: "👏",
  пригласить_на_танец: "💃", присоединиться: "🤲", сделать_комплимент: "✨", приготовить_ужин: "🍽️", подарить_цветы: "🌹",
  рассказать_историю: "📖", спеть_серенаду: "🎤", пригласить_на_прогулку: "🚶", поиграть_в_игру: "🎮", разделить_трапезу: "🍴",
  
  // 🎭 Эмоции/Реакции (15)
  засмеяться: "😂", заплакать: "😢", вздохнуть: "😔", нахмуриться: "😠", удивиться: "😲",
  испугаться: "😱", разозлиться: "🤬", восхититься: "🤩", возмутиться: "😤", усмехнуться: "😏",
  закатить_глаза: "🙄", поднять_бровь: "😒", надуть_губы: "😒", похлопать_в_ладоши: "👏", лицом_о_стол: "😩",
  
  // 🚀 Действия/Активность (20)
  побежать: "🏃", спрятаться: "🫣", замереть: "🧊", присесть: "🪑", прилечь: "🛌",
  встать: "🚶", подпрыгнуть: "⬆️", нырнуть: "🤿", качнуть_головой: "📭", кивнуть: "👍",
  взять_в_руки: "🤲", бросить: "🪃", осмотреть: "🔍", прислушаться: "👂", принюхаться: "👃",
  кричать: "📣", шептать: "🤫", исчезнуть: "💨", появиться: "✨", телепортироваться: "🌀",
  
  // ❄️ Магия/Сверхъестественное (20)
  заморозить: "❄️", поджечь: "🔥", ослепить_вспышкой: "💡", шокировать_током: "⚡", призвать_молнию: "⚡",
  наложить_проклятие: "🗝️", снять_проклятие: "✝️", исцелить: "💊", воскресить: "🧟", прочитать_мысли: "🧠",
  стать_невидимым: "👻", парить_в_воздухе: "☁️", превратиться_в_зверя: "🐺", призвать_демона: "😈", открыть_портал: "🌀",
  создать_иллюзию: "🎭", управлять_разумом: "🎪", остановить_время: "⏸️", управлять_погодой: "🌦️", призвать_метель: "❄️",
  
  // 🛠️ Прочие/Бытовые (11)
  напоить_чаем: "🫖", накормить_пирогом: "🥧", принести_кофе: "☕", накрыть_пледом: "🛏️", починить_механизм: "🔧",
  взломать_замок: "🔓", написать_письмо: "💌", прошептать_на_ухо: "👂", догнать: "🏃💨", обернуться: "🔄", отступить: "↪️",
};

// Словарь спряжений в прошедшем времени (мужской род)
const rpVerbsPastTense: Record<string, string> = {
  выстрелить: "выстрелил", ударить: "ударил", убить: "убил", арестовать: "арестовал", зарезать: "зарезал",
  отравить: "отравил", взорвать: "взорвал", сжечь: "сжег", задушить: "задушил", толкнуть: "толкнул",
  пнуть: "пнул", связать: "связал", запереть: "запер", подвергнуть_пыткам: "подвергнул пыткам", закопать: "закопал",
  обезглавить: "обезглавил", расстрелять: "расстрелял", сбросить_с_высоты: "сбросил с высоты", укусить: "укусил", оглушить: "оглушил",
  обезвредить: "обезвредил", разоружить: "разоружил", швырнуть_об_стену: "швырнул об стену", прижать_к_стене: "прижал к стене", наступить_на_ногу: "наступил на ногу",
  выебать: "выебал", сосать: "отсосал", трахать: "трахал", ебать: "ебал", лизать: "лизал",
  задрочить: "задрочил", дрочить: "дрочил", доминировать: "доминировал", подчиняться: "подчинялся", приковать: "приковал",
  
  обнять: "обнял", поцеловать: "поцеловал", целовать: "целовал", погладить_по_голове: "погладил по голове", улыбнуться: "улыбнулся",
  подмигнуть: "подмигнул", пожать_руку: "пожал руку", выслушать: "выслушал", утешить: "утешил", похвалить: "похвалил",
  пригласить_на_танец: "пригласил на танец", присоединиться: "присоединился", сделать_комплимент: "сделал комплимент", приготовить_ужин: "приготовил ужин", подарить_цветы: "подарил цветы",
  рассказать_историю: "рассказал историю", спеть_серенаду: "спел серенаду", пригласить_на_прогулку: "пригласил на прогулку", поиграть_в_игру: "поиграл в игру", разделить_трапезу: "разделил трапезу",
  
  засмеяться: "засмеялся", заплакать: "заплакал", вздохнуть: "вздохнул", нахмуриться: "нахмурился", удивиться: "удивился",
  испугаться: "испугался", разозлиться: "разозлился", восхититься: "восхитился", возмутиться: "возмутился", усмехнуться: "усмехнулся",
  закатить_глаза: "закатил глаза", поднять_бровь: "поднял бровь", надуть_губы: "надул губы", похлопать_в_ладоши: "похлопал в ладоши", лицом_о_стол: "уткнулся лицом о стол",
  
  побежать: "побежал", спрятаться: "спрятался", замереть: "замер", присесть: "присел", прилечь: "прилег",
  встать: "встал", подпрыгнуть: "подпрыгнул", нырнуть: "нырнул", качнуть_головой: "качнул головой", кивнуть: "кивнул",
  взять_в_руки: "взял в руки", бросить: "бросил", осмотреть: "осмотрел", прислушаться: "прислушался", принюхаться: "принюхался",
  кричать: "кричал", шептать: "шептал", исчезнуть: "исчез", появиться: "появился", телепортироваться: "телепортировался",
  
  заморозить: "заморозил", поджечь: "поджег", ослепить_вспышкой: "ослепил вспышкой", шокировать_током: "шокировал током", призвать_молнию: "призвал молнию",
  наложить_проклятие: "наложил проклятие", снять_проклятие: "снял проклятие", исцелить: "исцелил", воскресить: "воскресил", прочитать_мысли: "прочитал мысли",
  стать_невидимым: "стал невидимым", парить_в_воздухе: "парил в воздухе", превратиться_в_зверя: "превратился в зверя", призвать_демона: "призвал демона", открыть_портал: "открыл портал",
  создать_иллюзию: "создал иллюзию", управлять_разумом: "управлял разумом", остановить_время: "остановил время", управлять_погодой: "управлял погодой", призвать_метель: "призвал метель",
  
  напоить_чаем: "напоил чаем", накормить_пирогом: "накормил пирогом", принести_кофе: "принес кофе", накрыть_пледом: "накрыл пледом", починить_механизм: "починил механизм",
  взломать_замок: "взломал замок", написать_письмо: "написал письмо", прошептать_на_ухо: "прошептал на ухо", догнать: "догнал", обернуться: "обернулся", отступить: "отступил",
};

// Описания действий для красивого формата
const rpActionDescriptions: Record<string, string[]> = {
  выебать: ["жёсткий интим", "страстный момент", "горячее действие"],
  сосать: ["интимный момент", "минет сцена", "минет"],
  трахать: ["интим", "страсть", "жаркий момент"],
  ебать: ["интимный момент", "жаркая сцена", "страсть"],
  лизать: ["ласка", "ласковый момент", "нежность"],
  задрочить: ["дрочка", "ласка", "интимный момент"],
  дрочить: ["ласка", "стимуляция", "интимный момент"],
  доминировать: ["доминирование", "власть", "контроль"],
  подчиняться: ["подчинение", "слабость", "послушание"],
  обнять: ["объятия", "ласка", "нежность"],
  поцеловать: ["поцелуй", "ласка", "страсть"],
  целовать: ["поцелуи", "ласка", "нежность"],
  ударить: ["боевое действие", "удар", "конфликт"],
  убить: ["боевое действие", "смертельный удар", "конец"],
  заморозить: ["магия", "ледяной удар", "волшебство"],
  поджечь: ["магия", "огненный удар", "волшебство"],
  засмеяться: ["эмоция", "смех", "веселье"],
  заплакать: ["эмоция", "слёзы", "грусть"],
  побежать: ["движение", "бег", "экшн"],
};

// Обработать RP действие
async function handleRpAction(ctx: Context, actionKey: string, emoji: string) {
  const text = (ctx.message as any)?.text || (ctx.message as any)?.caption || '';
  const user = await getOrCreateUser(ctx);
  if (!user) return;

  const replyTo = (ctx.message as any)?.reply_to_message;
  if (!replyTo || !replyTo.from) {
    return await ctx.reply(`${emoji} Ответьте на сообщение пользователя или укажите @username`);
  }

  const targetUser = replyTo.from;
  const [dbTargetUser] = await db.select().from(users).where(eq(users.telegramId, targetUser.id));
  
  // ПРОВЕРКА НЕВИДИМОСТИ: если жертва невидима, игнорируем RP действие
  if (dbTargetUser && dbTargetUser.isInvisible && dbTargetUser.invisibilityUntil && new Date() < new Date(dbTargetUser.invisibilityUntil)) {
    return; // Молча игнорируем действие
  }
  
  const sticker = rpActions[actionKey] || emoji;
  const senderPrefix = user.nickPrefix ? `${user.nickPrefix} ` : (isOwner(user.telegramId) ? '👑 ВЛАДЕЛЕЦ 👑 ' : (user.isPremium ? '✨ ПРЕМИУМ ✨ ' : ''));
  const targetPrefix = targetUser.nickPrefix ? `${targetUser.nickPrefix} ` : (isOwner(targetUser.telegramId) ? '👑 ВЛАДЕЛЕЦ 👑 ' : (targetUser.isPremium ? '✨ ПРЕМИУМ ✨ ' : ''));
  const senderName = user.username ? `@${user.username}` : user.firstName || "Юзер";
  const targetName = targetUser.username ? `@${targetUser.username}` : targetUser.first_name || "Юзер";
  const pastTenseVerb = rpVerbsPastTense[actionKey] || actionKey;
  
  // Получить описание действия (если есть) или использовать случайное
  const descriptions = rpActionDescriptions[actionKey];
  const description = descriptions ? descriptions[Math.floor(Math.random() * descriptions.length)] : "RP сцена";
  
  // Красивый формат: эмодзи | Описание сцены | Контекст
  const message = `${sticker} | ${senderPrefix}${senderName} ${pastTenseVerb} ${targetPrefix}${targetName} | ${description}`;
  
  await ctx.reply(message);
}

// Проверить лимит трансформации (НО НЕ ДЛЯ ВЛАДЕЛЬЦА)
async function checkTransformCooldown(user: any): Promise<{ canTransform: boolean; message?: string }> {
  // Владелец НЕ ИМЕЕТ ЛИМИТОВ
  if (isOwner(user.telegramId)) return { canTransform: true };
  
  if (!user.lastTransformAt) return { canTransform: true };
  
  const lastTransform = new Date(user.lastTransformAt);
  const now = new Date();
  const hoursSince = (now.getTime() - lastTransform.getTime()) / (1000 * 60 * 60);
  
  if (hoursSince < TRANSFORM_COOLDOWN_HOURS) {
    const hoursLeft = Math.ceil(TRANSFORM_COOLDOWN_HOURS - hoursSince);
    return {
      canTransform: false,
      message: `⏳ Вы уже использовали трансформацию! Осталось <b>${hoursLeft}ч</b> до следующей попытки.`
    };
  }
  
  return { canTransform: true };
}

// ═══════════════════════════════════════════════════════════
// ОСНОВНЫЕ КОМАНДЫ
// ═══════════════════════════════════════════════════════════

bot.command('start', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  await ctx.replyWithHTML(
    `👋 <b>Добро пожаловать в VOIG BOT!</b>\n\n` +
    `🎮 Бот для развлечений, экономики, игр и RP в Telegram.\n\n` +
    `💰 Стартовый баланс: <b>${formatNumber(user.balance)} ⭐</b>\n` +
    `${user.isPremium ? '✨ Статус: <b>ПРЕМИУМ</b>' : '⚪ Статус: <b>ОБЫЧНЫЙ</b>'}\n\n` +
    `<b>200+ команд доступно!</b>`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Все команды', 'menu_all_commands')],
      [Markup.button.callback('🔵 Основные', 'menu_main')],
      [Markup.button.callback('🎮 Игры', 'menu_games')],
      [Markup.button.callback('🎭 RP', 'menu_rp')],
      [Markup.button.callback('💍 Браки', 'menu_marry')],
      [Markup.button.callback('💎 Премиум', 'menu_premium')],
    ])
  );
});

// Меню кнопки
bot.action('menu_all_commands', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📋 <b>200+ КОМАНД</b>\n\n` +
    `<b>👤 ПРОФИЛЬ:</b> инфо, баланс, ид, денги\n` +
    `<b>💰 ЭКОНОМИКА:</b> daily, weekly, топ, отправить\n` +
    `<b>🎮 ИГРЫ:</b> roll, dice, казино, fish, duel\n` +
    `<b>💍 БРАКИ:</b> marry, accept_marry, divorce\n` +
    `<b>💎 ПРЕМИУМ:</b> невидимость, transform, префикс\n` +
    `<b>🎭 RP (111+):</b> обнять, ударить, целовать и др.`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_main', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🔵 <b>ОСНОВНЫЕ</b>\n\n` +
    `👤 /инфо, инфо\n` +
    `💰 /баланс, баланс\n` +
    `🆔 /ид\n\n` +
    `🎁 /daily, daily (+500/1000⭐)\n` +
    `🎁 /weekly, weekly (+10k⭐)\n` +
    `🏆 /топ, топ\n` +
    `📤 отправить N @user\n\n` +
    `✨ /невидимость (КД 4ч)\n` +
    `🐾 /transform (КД 24ч)`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_games', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🎮 <b>ИГРЫ</b>\n\n` +
    `🎲 roll, кубик (1-6)\n` +
    `🪙 dice, монета (орёл/решка)\n` +
    `🎰 /slots, slots (50⭐)\n` +
    `🎰 /казино N (50/50)\n` +
    `🎣 /fish, fish (50⭐, 5/день)\n` +
    `⚔️ duel @user N (PvP)`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_rp', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🎭 <b>RP (111+)</b>\n\n` +
    `⚔️ Боевые: ударить, убить, выстрелить...\n` +
    `❤️ Позитив: обнять, целовать, погладить...\n` +
    `🎭 Эмоции: смеяться, плакать, испугаться...\n` +
    `✨ Магия: заморозить, поджечь, исцелить...\n` +
    `🚀 Действия: прыгнуть, спрятаться, бежать...\n\n` +
    `📝 Ответьте на сообщение и напишите команду БЕЗ /`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_marry', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💍 <b>БРАКИ</b>\n\n` +
    `💒 /marry @user\n` +
    `💒 marry @user\n` +
    `💒 брак @user\n` +
    `💒 жениться @user\n\n` +
    `✅ /accept_marry\n\n` +
    `💔 /divorce\n` +
    `💔 развод`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_info', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `👤 <b>ИНФОРМАЦИЯ И ПРОФИЛЬ:</b>\n\n` +
    `<b>ПРОФИЛЬ (Текст и /):</b>\n` +
    `/инфо\n` +
    `инфо\n` +
    `/профиль\n` +
    `профиль\n\n` +
    `<b>ID И БАЛАНС (Текст и /):</b>\n` +
    `/ид\n` +
    `ид\n` +
    `/balance\n` +
    `баланс\n\n` +
    `<b>ТОП БОГАЧЕЙ:</b>\n` +
    `/top_rich\n` +
    `топ`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_premium', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💎 <b>ПРЕМИУМ (200⭐)</b>\n\n` +
    `✨ Daily: 1000⭐ (не 500)\n` +
    `✨ Weekly: 10,000⭐\n` +
    `✨ Трансформация (1ч, КД 24ч)\n` +
    `✨ Невидимость (2ч, КД 4ч)\n\n` +
    `🛍️ /buy_premium\n🛍️ купить премиум\n\n` +
    `👑 Владелец - бесплатный премиум!`,
    { parse_mode: 'HTML' }
  );
});

// Команда покупки премиума
bot.command('buy_premium', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  if (user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date()) {
    return await ctx.reply('✨ У вас уже есть активный премиум!');
  }
  
  try {
    await ctx.replyWithHTML(
      `💎 <b>Купить ПРЕМИУМ за 200 Telegram Stars</b>\n\n` +
      `Вы получите:\n` +
      `• Повышенные бонусы\n` +
      `• Эксклюзивные команды\n` +
      `• Еженедельные награды`,
      Markup.inlineKeyboard([
        [Markup.button.pay('💳 Оплатить 200 ⭐')]
      ])
    );
  } catch (e) {
    await ctx.reply('❌ Ошибка при открытии платежа');
  }
});

// Проверка платежа перед оплатой
bot.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (e) {
    console.error('Pre-checkout error:', e);
  }
});

// Успешный платёж
bot.on('successful_payment', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const payment = ctx.message?.successful_payment;
  if (!payment) return;
  
  const starsAmount = payment.total_amount;
  
  // Премиум за 200 звёзд
  if (starsAmount === 200) {
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 1);
    
    await db.update(users).set({
      isPremium: true,
      premiumUntil,
    }).where(eq(users.id, user.id));
    
    await db.insert(premiumPurchases).values({
      userId: user.id,
      telegramPaymentChargeId: payment.telegram_payment_charge_id,
      starsAmount: 200,
      premiumMonths: 1,
      status: 'completed',
    });
    
    return await ctx.replyWithHTML(
      `✨ <b>СПАСИБО ЗА ПОКУПКУ!</b>\n\n` +
      `🎉 Вы получили <b>ПРЕМИУМ</b> на 1 месяц!\n` +
      `💎 Премиум закончится: ${premiumUntil.toLocaleDateString('ru-RU')}`
    );
  }
  
  // Валюта за звёзды (10 звёзд = 10k)
  const currencyAmount = (starsAmount / 10) * 10000;
  await db.update(users).set({
    balance: user.balance + currencyAmount,
  }).where(eq(users.id, user.id));
  
  await db.insert(currencyPurchases).values({
    userId: user.id,
    telegramPaymentChargeId: payment.telegram_payment_charge_id,
    starsAmount,
    currencyAmount: Math.floor(currencyAmount),
    status: 'completed',
  });
  
  await ctx.replyWithHTML(
    `💰 <b>ПОКУПКА ЗАВЕРШЕНА!</b>\n\n` +
    `Вы получили: <b>${formatNumber(Math.floor(currencyAmount))}</b> пойнтов\n` +
    `Новый баланс: <b>${formatNumber(user.balance + currencyAmount)}</b>`
  );
});

// Еженедельный бонус для премиум (БЕЗ ЛИМИТОВ ДЛЯ ВЛАДЕЛЬЦА)
bot.command('weekly', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  if (!user.isPremium && !isOwner(user.telegramId)) {
    return await ctx.reply('❌ Эта команда только для премиум пользователей! Купите премиум: /buy_premium');
  }
  
  const now = new Date();
  const lastWeekly = user.lastWeeklyBonusAt ? new Date(user.lastWeeklyBonusAt) : null;
  
  // ВЛАДЕЛЕЦ БЕЗ ЛИМИТОВ
  if (!isOwner(user.telegramId) && lastWeekly) {
    const daysSince = (now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      const daysLeft = Math.ceil(7 - daysSince);
      return await ctx.replyWithHTML(
        `⏳ Вы уже получали еженедельный бонус!\n` +
        `Приходите через <b>${daysLeft} дней</b>`
      );
    }
  }
  
  await db.update(users).set({
    balance: user.balance + WEEKLY_BONUS_POINTS,
    lastWeeklyBonusAt: now,
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `🎁 <b>ЕЖЕНЕДЕЛЬНЫЙ БОНУС ПРЕМИУМА:</b>\n\n` +
    `+${formatNumber(WEEKLY_BONUS_POINTS)} 💰\n` +
    `💰 Новый баланс: ${formatNumber(user.balance + WEEKLY_BONUS_POINTS)}`
  );
});

// RP КОМАНДЫ - ВСЕ ВАРИАНТЫ
const rpCommands = [
  ['hug', 'обнять', 'обнимать'],
  ['kiss', 'целовать', 'поцеловать'],
  ['hit', 'бить', 'ударить'],
  ['pat', 'гладить', 'гладь'],
  ['slap', 'шлепать', 'шлеп'],
  ['lick', 'лизать', 'лиз'],
  ['bite', 'кусать', 'кус'],
  ['fuck', 'выебать', 'трахать', 'ебать'],
  ['suck', 'сосать', 'сос'],
  ['jerk', 'задрочить', 'дрочить'],
  ['dominate', 'доминировать', 'доминирование'],
  ['obey', 'подчиняться', 'подчинение'],
  ['bind', 'связать', 'связывать'],
  ['chain', 'приковать', 'приковывать'],
];

for (const [cmdEn, ...cmdRu] of rpCommands) {
  for (const cmd of [cmdEn, ...cmdRu]) {
    bot.command(cmd, async (ctx) => {
      await handleRpAction(ctx, cmdRu[0] || cmd, rpActions[cmdRu[0] || cmd] || '💫');
    });
  }
}

// ТЕКСТОВЫЕ RP КОМАНДЫ
bot.on(message('text'), async (ctx, next) => {
  const text = ctx.message.text.toLowerCase().trim();
  const user = await getOrCreateUser(ctx);
  if (!user) return next();
  
  // Проверка превращения - удалить если нет звука
  if (user.transformUntil && new Date() < new Date(user.transformUntil) && user.transformAnimal) {
    const sound = ANIMAL_SOUNDS[user.transformAnimal];
    if (sound && !text.startsWith(sound)) {
      try { await ctx.deleteMessage(); } catch (e) {}
      return;
    }
  }
  
  // баланс
  if (text === 'баланс') {
    return await ctx.replyWithHTML(`💰 <b>Баланс:</b> ${formatNumber(user.balance)} ⭐`);
  }
  
  // денги [число] - только владелец
  if (text.match(/^денги\s+(\d+)$/)) {
    if (!isOwner(user.telegramId)) {
      return await ctx.reply("🚫 Только владелец!");
    }
    const amount = parseInt(text.match(/^денги\s+(\d+)$/)![1]);
    const newBalance = user.balance + amount;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, user.id));
    return await ctx.replyWithHTML(`💎 +${formatNumber(amount)} ⭐\n💰 Баланс: ${formatNumber(newBalance)}`);
  }
  
  // отправить [сумма] @username
  if (text.match(/^отправить\s+(\d+)\s+@(\w+)/)) {
    const match = text.match(/^отправить\s+(\d+)\s+@(\w+)/)!;
    const amount = parseInt(match[1]);
    const targetUsername = match[2];
    
    if (amount <= 0) return await ctx.reply('❌ Сумма должна быть больше 0');
    if (user.balance < amount) return await ctx.reply('❌ Недостаточно звёзд');
    
    const [targetUser] = await db.select().from(users).where(eq(users.username, targetUsername));
    if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
    
    await db.update(users).set({ balance: user.balance - amount }).where(eq(users.id, user.id));
    await db.update(users).set({ balance: targetUser.balance + amount }).where(eq(users.id, targetUser.id));
    
    return await ctx.replyWithHTML(`✅ Отправлено ${formatNumber(amount)} ⭐ для @${targetUsername}`);
  }
  
  // RP текстовые команды
  for (const [_, ...variants] of rpCommands) {
    if (variants.includes(text)) {
      return await handleRpAction(ctx, variants[0], '💫');
    }
  }
  
  return next();
});

// СТАНДАРТНЫЕ КОМАНДЫ
bot.command('help', async (ctx) => {
  await ctx.replyWithHTML(
    `📋 <b>200+ КОМАНД VOIG BOT!</b>\n\n` +
    `<b>🔹 ПРОФИЛЬ И БАЛАНС:</b>\n` +
    `/инфо, инфо - профиль\n` +
    `/balance, баланс - баланс\n` +
    `/ид - ваш ID\n\n` +
    `<b>💰 ЭКОНОМИКА:</b>\n` +
    `/daily, daily - +500/1000⭐ (ежедневный)\n` +
    `/weekly, weekly - +10000⭐ (еженедельный, премиум)\n` +
    `/top_rich, топ - топ 10 богачей\n` +
    `отправить [число] @user - переводы\n\n` +
    `<b>🎮 ИГРЫ:</b>\n` +
    `roll, dice, кубик, монета - 1-6\n` +
    `/slots, slots [ставка] - слот машина\n` +
    `/казино [ставка] - казино (50/50)\n` +
    `/fish, fish - рыбалка (50⭐, 5/день)\n` +
    `duel @user [ставка] - дуэль\n\n` +
    `<b>💍 БРАКИ:</b>\n` +
    `/marry @user, marry @user, брак @user\n` +
    `/accept_marry - принять\n` +
    `/divorce, развод - развестись\n\n` +
    `<b>💎 ПРЕМИУМ:</b>\n` +
    `/buy_premium, купить премиум\n` +
    `/невидимость, невидимость (2ч, КД 4ч)\n` +
    `/transform животное (1ч, КД 24ч)\n\n` +
    `<b>🎭 RP КОМАНДЫ (111+):</b>\n` +
    `Ответьте на сообщение и напишите команду БЕЗ /\n` +
    `ударить, обнять, целовать, убить, ударить и 100+ других!`
  );
});

bot.command('инфо', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [marriage] = await db.select().from(marriages)
    .where(or(eq(marriages.user1Id, user.id), eq(marriages.user2Id, user.id)))
    .limit(1);
  
  let marriageText = "Нет";
  if (marriage) {
    const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;
    const [partner] = await db.select().from(users).where(eq(users.id, partnerId));
    marriageText = partner ? `@${partner.username}` : "?";
  }
  
  let transformText = "";
  if (user.transformAnimal && user.transformUntil && new Date(user.transformUntil) > new Date()) {
    const emoji = ANIMAL_EMOJIS[user.transformAnimal] || "🦊";
    transformText = `\n🐾 ${emoji} ${user.transformAnimal}`;
  }
  
  await ctx.replyWithHTML(
    `👤 <b>ПРОФИЛЬ</b>\n\n` +
    `🆔 ID: ${user.telegramId}\n` +
    `👤 @${user.username || user.firstName}\n` +
    `💰 Баланс: ${formatNumber(user.balance)} ⭐\n` +
    `🏆 Репутация: ${user.reputation}\n` +
    `💍 Браки: ${marriage ? 'Да' : 'Нет'}\n` +
    `✨ ${user.isPremium ? 'ПРЕМИУМ ✨' : 'Обычный'}${transformText}`
  );
});

bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  await ctx.replyWithHTML(`💰 ${formatNumber(user.balance)} ⭐`);
});

bot.command('daily', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[DAILY] ${user.username} вызвал /daily`);
  const now = new Date();
  const lastDaily = user.dailyBonusAt ? new Date(user.dailyBonusAt) : null;
  
  // ВЛАДЕЛЕЦ БЕЗ ЛИМИТОВ
  if (!isOwner(user.telegramId) && lastDaily) {
    const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince);
      return await ctx.replyWithHTML(`⏰ Приходите через <b>${hoursLeft}ч</b>`);
    }
  }
  
  const bonus = user.isPremium ? 1000 : 500;
  const newBalance = user.balance + bonus;
  await db.update(users).set({ balance: newBalance, dailyBonusAt: now }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(`✅ +${bonus} ⭐\n💰 Баланс: ${formatNumber(newBalance)}`);
});

// ИГРЫ
bot.command('roll', async (ctx) => {
  const roll = randomInt(1, 6);
  await ctx.replyWithHTML(`🎲 Результат: <b>${roll}</b>`);
});

bot.command('dice', async (ctx) => {
  const roll = randomInt(1, 6);
  await ctx.replyWithHTML(`🎲 <b>${roll}</b>`);
});

bot.command('slots', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  if (user.balance < 50) return await ctx.reply('❌ Нужно 50⭐');
  
  const symbols = ['🍎', '🍌', '🍊', '🍓', '🍑'];
  const results = [symbols[randomInt(0, 4)], symbols[randomInt(0, 4)], symbols[randomInt(0, 4)]];
  const won = results[0] === results[1] && results[1] === results[2];
  const win = won ? 500 : 0;
  const newBalance = user.balance - 50 + win;
  
  await db.update(users).set({ balance: newBalance }).where(eq(users.id, user.id));
  await ctx.replyWithHTML(won ? `🎉 ${results.join('')} +${win}⭐` : `😢 ${results.join('')} -50⭐`);
});

bot.command('fish', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  // Проверка лимита 5 рыбалок в день
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastFish = user.lastFishAt ? new Date(user.lastFishAt) : null;
  const lastFishDay = lastFish ? new Date(lastFish.getFullYear(), lastFish.getMonth(), lastFish.getDate()) : null;
  
  // Если это новый день, сброс счетчика
  let fishCount = user.fishCountToday || 0;
  if (!lastFishDay || lastFishDay < today) {
    fishCount = 0;
  }
  
  if (fishCount >= FISH_LIMIT_PER_DAY) {
    return await ctx.replyWithHTML(`❌ <b>Лимит рыбалки:</b> ${FISH_LIMIT_PER_DAY}/день\n⏳ Попробуйте завтра!`);
  }
  
  if (user.balance < 50) return await ctx.reply('❌ Нужно 50⭐');
  
  const fish = ['🐟', '🐠', '🐡', '🦈'];
  const caught = fish[randomInt(0, 3)];
  const win = randomInt(50, 500);
  const newBalance = user.balance - 50 + win;
  
  await db.update(users).set({ 
    balance: newBalance,
    lastFishAt: new Date(),
    fishCountToday: fishCount + 1,
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(`${caught} Поймали! +${win}⭐\n\n🎣 <b>Рыбалка:</b> ${fishCount + 1}/${FISH_LIMIT_PER_DAY}`);
});

// ТРАНСФОРМАЦИЯ ДРУГОГО ПОЛЬЗОВАТЕЛЯ В РАНДОМНОЕ ЖИВОТНОЕ
bot.command('transform', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[TRANSFORM] Пользователь ${user.username} (${user.telegramId}) вызвал /transform`);
  
  const { canTransform, message: msg } = await checkTransformCooldown(user);
  if (!canTransform) {
    console.log(`[TRANSFORM] КД: ${msg}`);
    return await ctx.replyWithHTML(msg!);
  }
  
  const msg_obj = ctx.message as any;
  const replyTo = msg_obj?.reply_to_message;
  
  if (!replyTo || !replyTo.from) {
    return await ctx.reply('❌ Ответьте на сообщение пользователя чтобы его превратить!');
  }
  
  // РАНДОМНОЕ животное
  const animal = ANIMALS[randomInt(0, ANIMALS.length - 1)];
  
  const [targetUser] = await db.select().from(users).where(eq(users.telegramId, replyTo.from.id));
  if (!targetUser) return;
  
  const transformUntil = new Date(Date.now() + TRANSFORM_DURATION_HOURS * 60 * 60 * 1000);
  await db.update(users).set({
    transformAnimal: animal,
    transformUntil,
    lastTransformAt: new Date(),
  }).where(eq(users.id, targetUser.id));
  
  await db.update(users).set({
    lastTransformAt: new Date(),
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `${ANIMAL_EMOJIS[animal]} <b>@${replyTo.from.username || replyTo.from.first_name} превратился в ${animal}!</b>\n\n` +
    `Длительность: ${TRANSFORM_DURATION_HOURS} час\n` +
    `⏳ <b>КД:</b> 24ч`
  );
});

// ТРАНСФОРМАЦИЯ ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ (на основе ответа)
async function handleTransformOther(ctx: Context) {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[TRANSFORM_OTHER] Пользователь ${user.username} (${user.telegramId}) вызвал команду превратить`);
  const msg = ctx.message as any;
  const text = msg?.text || '';
  const args = text.split(' ');
  const animal = args[1]?.toLowerCase();
  
  const replyTo = msg?.reply_to_message;
  if (!replyTo || !replyTo.from) {
    if (!animal) {
      return await ctx.reply('❌ Ответьте на сообщение пользователя или напишите: /преврати животное');
    }
    return await ctx.reply('❌ Ответьте на сообщение пользователя');
  }
  
  // Проверка кулдауна (только для не-владельца)
  if (!isOwner(user.telegramId)) {
    if (user.lastTransformAt) {
      const lastTransform = new Date(user.lastTransformAt);
      const now = new Date();
      const hoursSince = (now.getTime() - lastTransform.getTime()) / (1000 * 60 * 60);
      
      if (hoursSince < TRANSFORM_COOLDOWN_HOURS) {
        const hoursLeft = Math.ceil(TRANSFORM_COOLDOWN_HOURS - hoursSince);
        const minutesLeft = Math.ceil((TRANSFORM_COOLDOWN_HOURS - hoursSince) * 60);
        return await ctx.replyWithHTML(
          `⏳ <b>КД:</b> ${hoursLeft}ч ${minutesLeft % 60}м\n❌ Вы уже использовали превращение!`
        );
      }
    }
  }
  
  if (!animal || !ANIMALS.includes(animal)) {
    return await ctx.reply(`❌ Животное не найдено. Доступны: ${ANIMALS.join(', ')}`);
  }
  
  const [targetUser] = await db.select().from(users).where(eq(users.telegramId, replyTo.from.id));
  if (!targetUser) return;
  
  const transformUntil = new Date(Date.now() + TRANSFORM_DURATION_HOURS * 60 * 60 * 1000);
  await db.update(users).set({
    transformAnimal: animal,
    transformUntil,
    lastTransformAt: new Date(),
  }).where(eq(users.id, targetUser.id));
  
  await db.update(users).set({
    lastTransformAt: new Date(),
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `${ANIMAL_EMOJIS[animal]} <b>@${replyTo.from.username || replyTo.from.first_name} преобразился в ${animal}!</b>\n\n⏳ <b>КД:</b> 24ч`
  );
}

bot.command('преврати', handleTransformOther);

// ПРЕМИУМ КОМАНДА: НЕВИДИМОСТЬ (2 часа действует, 4 часа КД)
async function handleInvisibility(ctx: Context) {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[INVISIBILITY] Пользователь ${user.username} (${user.telegramId}) вызвал команду невидимость`);
  const now = new Date();
  const now_ms = now.getTime();
  
  // Проверка КД (4 часа между использованиями)
  if (!isOwner(user.telegramId) && user.lastInvisibilityAt) {
    const lastInvisibility = new Date(user.lastInvisibilityAt);
    const hoursSince = (now_ms - lastInvisibility.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < INVISIBILITY_COOLDOWN_HOURS) {
      const hoursLeft = Math.ceil(INVISIBILITY_COOLDOWN_HOURS - hoursSince);
      const minutesLeft = Math.ceil((INVISIBILITY_COOLDOWN_HOURS - hoursSince) * 60);
      return await ctx.replyWithHTML(
        `⏳ <b>КД:</b> ${hoursLeft}ч ${minutesLeft % 60}м\n❌ Вы уже использовали невидимость!`
      );
    }
  }
  
  // Проверка премиума
  if (!user.isPremium && !isOwner(user.telegramId)) {
    return await ctx.reply('❌ Только для премиум пользователей! Купите премиум: /buy_premium');
  }
  
  // Если уже невидим, показать оставшееся время действия
  if (user.isInvisible && user.invisibilityUntil && new Date(user.invisibilityUntil) > now) {
    const timeLeft = new Date(user.invisibilityUntil).getTime() - now_ms;
    const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
    const hoursLeft = Math.floor(minutesLeft / 60);
    return await ctx.replyWithHTML(
      `👻 Вы уже невидимы!\n⏳ Осталось: ${hoursLeft}ч ${minutesLeft % 60}м`
    );
  }
  
  const invisibilityUntil = new Date(now_ms + INVISIBILITY_DURATION_HOURS * 60 * 60 * 1000);
  await db.update(users).set({
    isInvisible: true,
    invisibilityUntil,
    lastInvisibilityAt: now,
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `👻 <b>ВЫ НЕВИДИМЫ!</b>\n\n` +
    `Длительность: ${INVISIBILITY_DURATION_HOURS} часа\n` +
    `Статус: <b>ПРИЗРАК</b> 👻\n\n` +
    `Все RP команды больше на вас не работают!\n` +
    `⏳ <b>КД:</b> ${INVISIBILITY_COOLDOWN_HOURS}ч`
  );
}

bot.command('невидимость', handleInvisibility);

// ОТНОШЕНИЯ
bot.command('marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[MARRY] ${user.username} (${user.telegramId}) вызвал /marry`);
  const match = ctx.message.text.match(/@(\w+)/);
  if (!match) return await ctx.reply('❌ /marry @username');
  
  const [targetUser] = await db.select().from(users).where(eq(users.username, match[1]));
  if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
  if (targetUser.id === user.id) return await ctx.reply('❌ Нельзя жениться на себе');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);
  
  await db.insert(pendingProposals).values({
    type: 'marry', fromUserId: user.id, toUserId: targetUser.id,
    chatId: ctx.chat.id as any, expiresAt,
  });
  
  console.log(`[MARRY] Предложение отправлено: ${user.username} -> ${targetUser.username}`);
  await ctx.replyWithHTML(`💍 Предложение брака отправлено @${targetUser.username}!\nОн может принять: /accept_marry`);
});

bot.command('accept_marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[MARRY] ${user.username} (${user.telegramId}) вызвал /accept_marry`);
  const [proposal] = await db.select().from(pendingProposals)
    .where(and(eq(pendingProposals.type, 'marry'), eq(pendingProposals.toUserId, user.id)))
    .limit(1);
  
  if (!proposal) return await ctx.reply('❌ Нет предложений');
  
  await db.insert(marriages).values({
    user1Id: proposal.fromUserId, user2Id: user.id, chatId: proposal.chatId,
  });
  
  await db.delete(pendingProposals).where(eq(pendingProposals.id, proposal.id));
  console.log(`[MARRY] Брак создан между ID ${proposal.fromUserId} и ${user.id}`);
  await ctx.reply('💍 ПОЗДРАВЛЯЕМ С БРАКОМ! 🎉');
});

bot.command('divorce', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[MARRY] ${user.username} (${user.telegramId}) вызвал /divorce`);
  const [marriage] = await db.select().from(marriages)
    .where(or(eq(marriages.user1Id, user.id), eq(marriages.user2Id, user.id)))
    .limit(1);
  
  if (!marriage) return await ctx.reply('❌ Вы не в браке');
  await db.delete(marriages).where(eq(marriages.id, marriage.id));
  console.log(`[MARRY] Развод: ${user.username}`);
  await ctx.reply('💔 Развод оформлен');
});

bot.command('dating', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const match = ctx.message.text.match(/@(\w+)/);
  if (!match) return await ctx.reply('❌ /dating @username');
  
  const [targetUser] = await db.select().from(users).where(eq(users.username, match[1]));
  if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
  
  await db.insert(relationships).values({
    user1Id: user.id, user2Id: targetUser.id, chatId: ctx.chat.id as any,
  });
  
  await ctx.reply(`💕 Отношения начались с @${targetUser.username}!`);
});

bot.command('breakup', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [relationship] = await db.select().from(relationships)
    .where(or(eq(relationships.user1Id, user.id), eq(relationships.user2Id, user.id)))
    .limit(1);
  
  if (!relationship) return await ctx.reply('❌ Вы не в отношениях');
  await db.delete(relationships).where(eq(relationships.id, relationship.id));
  await ctx.reply('💔 Отношения закончились');
});

// МОДЕРАЦИЯ
bot.command('ban', async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return await ctx.reply('❌ Только в группах');
  
  try {
    const admins = await ctx.getChatAdministrators();
    if (!admins.some(a => a.user.id === ctx.from?.id)) return await ctx.reply('❌ Только администраторы');
    
    const match = ctx.message.text.match(/@(\w+)/);
    if (!match) return await ctx.reply('❌ /ban @username');
    
    const [targetUser] = await db.select().from(users).where(eq(users.username, match[1]));
    if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
    
    await ctx.banChatMember(targetUser.telegramId);
    
    const user = await getOrCreateUser(ctx);
    await db.insert(bans).values({
      userId: targetUser.id, chatId: ctx.chat.id as any,
      issuedBy: user!.id, reason: 'Забанен администратором',
    });
    
    await ctx.reply(`🚫 @${match[1]} забанен`);
  } catch (e) {
    await ctx.reply('❌ Ошибка');
  }
});

// РАЗМУТ КОМАНДА
bot.command('размут', async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return await ctx.reply('❌ Только в группах');
  
  try {
    const admins = await ctx.getChatAdministrators();
    if (!admins.some(a => a.user.id === ctx.from?.id)) return await ctx.reply('❌ Только администраторы');
    
    const replyTo = (ctx.message as any)?.reply_to_message;
    if (!replyTo || !replyTo.from) {
      return await ctx.reply('❌ Ответьте на сообщение пользователя');
    }
    
    await ctx.restrictChatMember(replyTo.from.id, {
      permissions: {
        can_send_messages: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: true,
        can_invite_users: true,
        can_pin_messages: true
      }
    });
    
    await ctx.replyWithHTML(`✅ <b>@${replyTo.from.username || replyTo.from.first_name} размучен!</b>`);
  } catch (e: any) {
    await ctx.reply(`❌ Ошибка: ${e.message}`);
  }
});

bot.command('warn', async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return await ctx.reply('❌ Только в группах');
  
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const match = ctx.message.text.match(/@(\w+)/);
  if (!match) return await ctx.reply('❌ /warn @username');
  
  const [targetUser] = await db.select().from(users).where(eq(users.username, match[1]));
  if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
  
  await db.insert(warnings).values({
    userId: targetUser.id, chatId: ctx.chat.id as any,
    issuedBy: user.id, reason: 'Нарушение правил',
  });
  
  await ctx.reply(`⚠️ @${match[1]} получил предупреждение`);
});

bot.command('top_rich', async (ctx) => {
  const topUsers = await db.select().from(users).where(ne(users.telegramId, BOT_OWNER_ID)).orderBy(desc(users.balance)).limit(10);
  const list = topUsers.map((u, i) => `${i + 1}. @${u.username || u.firstName} - ${formatNumber(u.balance)}⭐`).join('\n');
  await ctx.replyWithHTML(`🏆 <b>ТОП 10:</b>\n\n${list}`);
});

bot.command('профиль', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  const prefix = user.nickPrefix ? `${user.nickPrefix} ` : (isOwner(user.telegramId) ? '👑 ВЛАДЕЛЕЦ 👑 ' : (user.isPremium ? '✨ ПРЕМИУМ ✨ ' : ''));
  await ctx.replyWithHTML(
    `👤 <b>ПРОФИЛЬ</b>\n` +
    `${prefix}@${user.username}\n` +
    `ID: ${user.telegramId}\n` +
    `💰 ${formatNumber(user.balance)}⭐\n` +
    `✨ ${user.isPremium ? 'ПРЕМИУМ' : 'Обычный'}`
  );
});

bot.command('ид', async (ctx) => {
  await ctx.reply(`🆔 Ваш ID: <code>${ctx.from?.id}</code>`, { parse_mode: 'HTML' });
});

// КОМАНДА ВЛАДЕЛЬЦА: ВЫДАЧА 9999999 МОНЕТ
bot.command('addcoins', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user || !isOwner(user.telegramId)) {
    return await ctx.reply('❌ Только для владельца');
  }
  
  await db.update(users).set({
    balance: 9999999
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `✅ <b>ВЫДАНО!</b>\n\n` +
    `💰 Баланс: <b>9,999,999⭐</b>`
  );
});

// ПОКУПКА ПРЕФИКСА НАД НИКОМ
bot.command('prefix', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const args = ctx.message.text.split(' ');
  const prefix = args.slice(1).join(' ');
  
  if (!prefix) {
    return await ctx.replyWithHTML(
      `<b>Использование:</b> /prefix текст\n\n` +
      `Префикс будет показываться рядом с вашим ником в группе\n` +
      `<b>Стоимость:</b> 10,000⭐\n` +
      `\n<b>Примеры:</b>\n` +
      `/prefix ✨ КОРОЛЕВА ✨\n` +
      `/prefix 👑 КОРОЛЬ 👑\n` +
      `/prefix 💎 ЛЕГЕНДА 💎`
    );
  }
  
  if (prefix.length > 20) {
    return await ctx.reply('❌ Префикс слишком длинный (максимум 20 символов)');
  }
  
  if (user.balance < 10000) return await ctx.reply('❌ Нужно 10,000⭐');
  
  // Сохраняем в БД
  await db.update(users).set({
    balance: user.balance - 10000,
    nickPrefix: prefix,
  }).where(eq(users.id, user.id));
  
  console.log(`[PREFIX] Префикс установлен: ${user.username} (${user.telegramId}) -> "${prefix}"`);
  
  await ctx.replyWithHTML(
    `✅ <b>Префикс установлен!</b>\n\n` +
    `<b>${prefix}</b> сохранён в профиле\n` +
    `(Бот должен быть администратором для отображения в списке членов)\n` +
    `Стоимость: -10,000⭐`
  );
});

// ═══════════════════════════════════════════════════════════
// ОБРАБОТЧИК ТЕКСТОВЫХ КОМАНД (БЕЗ "/" ПРЕФИКСА)
// ═══════════════════════════════════════════════════════════

bot.on('text', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const text = ctx.message.text.toLowerCase().trim();
  const replyTo = ctx.message.reply_to_message;
  
  // СПИСОК ВСЕХ ТЕКСТОВЫХ КОМАНД
  const textCommands = [
    'денги', 'инфо', 'профиль', 'ид', 'баланс', 'balance', 'prefix', 'префикс',
    'daily', 'weekly', 'невидимость', 'отправить', 'roll', 'dice', 'кубик', 'монета',
    'duel', 'дуэль', 'marry', 'брак', 'жениться', 'divorce', 'развод',
    'top_rich', 'топ', 'купить премиум', 'казино', 'slots', 'слот', 'fish', 'рыбалка',
    'преврати', 'превратить', 'мут', 'очистка'
  ];
  
  // ВСЕ 111 RP команды тоже разрешены
  const isRpCommand = Object.keys(rpActions).some(cmd => text === cmd);
  
  // Проверяем, является ли это командой
  const isCommand = textCommands.some(cmd => text === cmd || text.startsWith(cmd + ' ')) || isRpCommand;
  
  // Проверка звуков животных для трансформированных пользователей (КРОМЕ КОМАНД)
  if (!isCommand && user.transformAnimal && user.transformUntil && new Date() < new Date(user.transformUntil)) {
    const expectedSound = ANIMAL_SOUNDS[user.transformAnimal];
    if (expectedSound && !text.includes(expectedSound)) {
      try {
        await ctx.deleteMessage();
      } catch (e) {}
      return;
    }
  }
  
  // КОМАНДЫ БЕЗ ОТВЕТА НА СООБЩЕНИЕ:
  
  // денги - только для владельца (9,999,999)
  if (text === 'денги') {
    if (!isOwner(user.telegramId)) {
      return await ctx.reply('❌ Только для владельца');
    }
    await db.update(users).set({ balance: 9999999 }).where(eq(users.id, user.id));
    return await ctx.replyWithHTML(`✅ <b>ВЫДАНО!</b>\n\n💰 Баланс: <b>9,999,999⭐</b>`);
  }
  
  // инфо / профиль
  if (text === 'инфо' || text === 'профиль') {
    const [marriage] = await db.select().from(marriages)
      .where(or(eq(marriages.user1Id, user.id), eq(marriages.user2Id, user.id)))
      .limit(1);
    
    let marriageText = "Нет";
    if (marriage) {
      const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;
      const [partner] = await db.select().from(users).where(eq(users.id, partnerId));
      marriageText = partner ? `@${partner.username}` : "?";
    }
    
    let transformText = "";
    if (user.transformAnimal && user.transformUntil && new Date(user.transformUntil) > new Date()) {
      const emoji = ANIMAL_EMOJIS[user.transformAnimal] || "🦊";
      transformText = `\n🐾 ${emoji} ${user.transformAnimal}`;
    }
    
    return await ctx.replyWithHTML(
      `👤 <b>ПРОФИЛЬ</b>\n\n` +
      `🆔 ID: ${user.telegramId}\n` +
      `👤 @${user.username || user.firstName}\n` +
      `💰 Баланс: ${formatNumber(user.balance)} ⭐\n` +
      `🏆 Репутация: ${user.reputation}\n` +
      `💍 Браки: ${marriage ? 'Да' : 'Нет'}\n` +
      `✨ ${user.isPremium ? 'ПРЕМИУМ ✨' : 'Обычный'}${transformText}`
    );
  }
  
  // ид
  if (text === 'ид') {
    return await ctx.replyWithHTML(`🆔 Ваш ID: <code>${ctx.from?.id}</code>`);
  }
  
  // баланс
  if (text === 'баланс' || text === 'balance') {
    return await ctx.replyWithHTML(`💰 <b>Баланс:</b> ${formatNumber(user.balance)} ⭐`);
  }
  
  // невидимость (текстом)
  if (text === 'невидимость') {
    console.log(`[INVISIBILITY-TEXT] ${user.username} вызвал невидимость текстом`);
    return await handleInvisibility(ctx);
  }
  
  // отправить [сумма] @username
  if (text.match(/^отправить\s+(\d+)\s+@(\w+)/)) {
    const match = text.match(/^отправить\s+(\d+)\s+@(\w+)/)!;
    const amount = parseInt(match[1]);
    const targetUsername = match[2];
    
    if (amount <= 0) return await ctx.reply('❌ Сумма должна быть больше 0');
    if (user.balance < amount) return await ctx.reply('❌ Недостаточно звёзд');
    
    const [targetUser] = await db.select().from(users).where(eq(users.username, targetUsername));
    if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
    
    await db.update(users).set({ balance: user.balance - amount }).where(eq(users.id, user.id));
    await db.update(users).set({ balance: targetUser.balance + amount }).where(eq(users.id, targetUser.id));
    
    return await ctx.replyWithHTML(`✅ Отправлено ${formatNumber(amount)} ⭐ для @${targetUsername}`);
  }
  
  // daily (текстом)
  if (text === 'daily') {
    const now = new Date();
    const lastDaily = user.dailyBonusAt ? new Date(user.dailyBonusAt) : null;
    
    if (!isOwner(user.telegramId) && lastDaily) {
      const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        return await ctx.replyWithHTML(`⏰ Приходите через <b>${hoursLeft}ч</b>`);
      }
    }
    
    const bonus = user.isPremium ? 1000 : 500;
    const newBalance = user.balance + bonus;
    await db.update(users).set({ balance: newBalance, dailyBonusAt: now }).where(eq(users.id, user.id));
    return await ctx.replyWithHTML(`✅ +${bonus} ⭐\n💰 Баланс: ${formatNumber(newBalance)}`);
  }
  
  // weekly (текстом)
  if (text === 'weekly') {
    const now = new Date();
    const lastWeekly = user.lastWeeklyBonusAt ? new Date(user.lastWeeklyBonusAt) : null;
    
    if (!user.isPremium && !isOwner(user.telegramId)) {
      return await ctx.reply('❌ Эта команда только для премиум пользователей!');
    }
    
    if (!isOwner(user.telegramId) && lastWeekly) {
      const daysSince = (now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        const daysLeft = Math.ceil(7 - daysSince);
        return await ctx.replyWithHTML(`⏳ Приходите через <b>${daysLeft} дней</b>`);
      }
    }
    
    await db.update(users).set({ balance: user.balance + WEEKLY_BONUS_POINTS, lastWeeklyBonusAt: now }).where(eq(users.id, user.id));
    return await ctx.replyWithHTML(`🎁 <b>+${formatNumber(WEEKLY_BONUS_POINTS)} 💰</b>\n💰 Новый баланс: ${formatNumber(user.balance + WEEKLY_BONUS_POINTS)}`);
  }
  
  // топ богачей
  if (text === 'топ' || text === 'top_rich') {
    const topUsers = await db.select().from(users).where(ne(users.telegramId, BOT_OWNER_ID)).orderBy(desc(users.balance)).limit(10);
    const list = topUsers.map((u, i) => `${i + 1}. @${u.username || u.firstName} - ${formatNumber(u.balance)}⭐`).join('\n');
    return await ctx.replyWithHTML(`🏆 <b>ТОП 10 БОГАЧЕЙ:</b>\n\n${list}`);
  }
  
  // купить премиум
  if (text === 'купить премиум') {
    return await ctx.replyWithHTML(`💎 <b>Купить ПРЕМИУМ за 200 Telegram Stars</b>\n\nВы получите:\n• Повышенные бонусы\n• Эксклюзивные команды\n• Еженедельные награды`);
  }
  
  // slots (текстом)
  if (text === 'slots' || text === 'слот') {
    if (user.balance < 50) return await ctx.reply('❌ Нужно 50⭐');
    const symbols = ['🍎', '🍌', '🍊', '🍓', '🍑'];
    const results = [symbols[randomInt(0, 4)], symbols[randomInt(0, 4)], symbols[randomInt(0, 4)]];
    const won = results[0] === results[1] && results[1] === results[2];
    const win = won ? 500 : 0;
    const newBalance = user.balance - 50 + win;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, user.id));
    return await ctx.replyWithHTML(won ? `🎉 ${results.join('')} +${win}⭐` : `😢 ${results.join('')} -50⭐`);
  }
  
  // fish (текстом)
  if (text === 'fish' || text === 'рыбалка') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastFish = user.lastFishAt ? new Date(user.lastFishAt) : null;
    const lastFishDay = lastFish ? new Date(lastFish.getFullYear(), lastFish.getMonth(), lastFish.getDate()) : null;
    let fishCount = user.fishCountToday || 0;
    if (!lastFishDay || lastFishDay < today) fishCount = 0;
    if (fishCount >= FISH_LIMIT_PER_DAY) return await ctx.replyWithHTML(`❌ <b>Лимит:</b> ${FISH_LIMIT_PER_DAY}/день\n⏳ Завтра!`);
    if (user.balance < 50) return await ctx.reply('❌ Нужно 50⭐');
    const fish = ['🐟', '🐠', '🐡', '🦈'];
    const caught = fish[randomInt(0, 3)];
    const win = randomInt(50, 500);
    const newBalance = user.balance - 50 + win;
    await db.update(users).set({ balance: newBalance, lastFishAt: new Date(), fishCountToday: fishCount + 1 }).where(eq(users.id, user.id));
    return await ctx.replyWithHTML(`${caught} Поймали! +${win}⭐\n\n🎣 <b>Рыбалка:</b> ${fishCount + 1}/${FISH_LIMIT_PER_DAY}`);
  }
  
  // казино [ставка] - новая команда
  if (text.startsWith('казино')) {
    const parts = text.split(' ');
    let bet = 100;
    if (parts[1]) {
      const parsedBet = parseInt(parts[1]);
      if (isNaN(parsedBet) || parsedBet <= 0) {
        return await ctx.reply('❌ Введите корректную ставку: казино 100');
      }
      bet = parsedBet;
    }
    
    if (user.balance < bet) {
      return await ctx.reply(`❌ Недостаточно звёзд. У вас ${formatNumber(user.balance)}⭐, нужно ${formatNumber(bet)}⭐`);
    }
    
    const result = randomInt(1, 2);
    const isWin = result === 1;
    const winAmount = Math.floor(bet * 1.5);
    const newBalance = isWin ? user.balance + winAmount : user.balance - bet;
    
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, user.id));
    
    if (isWin) {
      return await ctx.replyWithHTML(`🎰 <b>ВЫИГРЫШ! 🎉</b>\n\n+${formatNumber(winAmount)}⭐\n💰 Баланс: ${formatNumber(newBalance)}`);
    } else {
      return await ctx.replyWithHTML(`🎰 <b>ПРОИГРЫШ 😢</b>\n\n-${formatNumber(bet)}⭐\n💰 Баланс: ${formatNumber(newBalance)}`);
    }
  }
  
  // divorce (текстом)
  if (text === 'divorce' || text === 'развод') {
    const [marriage] = await db.select().from(marriages).where(or(eq(marriages.user1Id, user.id), eq(marriages.user2Id, user.id))).limit(1);
    if (!marriage) return await ctx.reply('❌ Вы не женаты');
    await db.delete(marriages).where(eq(marriages.id, marriage.id));
    return await ctx.reply('💔 Развод завершён');
  }
  
  // КОМАНДЫ С ОТВЕТОМ НА СООБЩЕНИЕ:
  
  if (!replyTo || !replyTo.from) return;
  
  // обнять, ударить, убить и т.д. - RP команды
  for (const [command, emoji] of Object.entries(rpActions)) {
    if (text === command) {
      await handleRpAction(ctx, command, emoji);
      return;
    }
  }
  
  // преврати животное (в ответ на его сообщение)
  if (text.match(/^преврати\s+(\w+)$/) || text.match(/^превратить\s+(\w+)$/)) {
    const animal = text.split(' ')[1].toLowerCase();
    if (!ANIMALS.includes(animal)) {
      return await ctx.reply(`❌ Животное не найдено. Доступны: ${ANIMALS.join(', ')}`);
    }
    console.log(`[TRANSFORM_TEXT] ${user.username} превращает через текст в ${animal}`);
    return await handleTransformOther(ctx);
  }
  
  // мут [число] - замутить на N минут
  if (text.match(/^мут\s+(\d+)$/)) {
    const minutes = parseInt(text.split(' ')[1]);
    if (!ctx.chat || ctx.chat.type === 'private') return await ctx.reply('❌ Только в группах');
    
    try {
      const mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
      await ctx.restrictChatMember(replyTo.from.id, {
        permissions: {
          can_send_messages: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        },
        until_date: Math.floor(mutedUntil.getTime() / 1000)
      });
      console.log(`[MUTE] ${user.username} замутил ${replyTo.from.username} на ${minutes}м`);
      await ctx.replyWithHTML(`🔇 <b>@${replyTo.from.username} замучен на ${minutes} минут</b>`);
    } catch (e: any) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
    return;
  }
  
  // очистка - удалить все о пользователе
  if (text === 'очистка') {
    console.log(`[CLEANUP] ${user.username} очищает профиль ${replyTo.from.username}`);
    const [targetUser] = await db.select().from(users).where(eq(users.telegramId, replyTo.from.id));
    if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
    
    // Очистить данные
    await db.update(users).set({
      transformAnimal: null,
      transformUntil: null,
      isInvisible: false,
      invisibilityUntil: null,
      nickPrefix: null,
    }).where(eq(users.id, targetUser.id));
    
    await ctx.replyWithHTML(`✅ <b>Профиль @${replyTo.from.username} очищен</b>`);
    return;
  }
  
  // ИГРЫ (текстом) - только локальные, без БД
  if (text === 'кубик' || text === 'roll') {
    const num = Math.floor(Math.random() * 6) + 1;
    await ctx.replyWithHTML(`🎲 <b>@${user.username}</b> выбросил: <b>${num}</b>`);
    return;
  }
  
  if (text === 'монета' || text === 'dice') {
    const result = Math.random() > 0.5 ? 'Орёл' : 'Решка';
    await ctx.replyWithHTML(`🪙 <b>@${user.username}</b> выбросил: <b>${result}</b>`);
    return;
  }
  
  // duel @user [ставка] (текстом)
  if (text.match(/^duel\s+@(\w+)/) || text.match(/^дуэль\s+@(\w+)/)) {
    const match = text.match(/@(\w+)/)!;
    const targetUsername = match[1];
    const [targetUser] = await db.select().from(users).where(eq(users.username, targetUsername));
    if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
    
    const parts = text.split(' ');
    let bet = 100;
    if (parts[2]) {
      const parsedBet = parseInt(parts[2]);
      if (!isNaN(parsedBet) && parsedBet > 0) bet = parsedBet;
    }
    
    if (user.balance < bet) return await ctx.reply(`❌ Нужно ${formatNumber(bet)}⭐`);
    if (targetUser.balance < bet) return await ctx.reply(`❌ У @${targetUsername} нет ${formatNumber(bet)}⭐`);
    
    const winner = Math.random() > 0.5 ? user.id : targetUser.id;
    const loser = winner === user.id ? targetUser.id : user.id;
    
    await db.update(users).set({ balance: sql`balance + ${bet}` }).where(eq(users.id, winner));
    await db.update(users).set({ balance: sql`balance - ${bet}` }).where(eq(users.id, loser));
    
    return await ctx.replyWithHTML(
      `⚔️ <b>ДУЭЛЬ:</b> @${winner === user.id ? user.username : targetUser.username} выиграл!\n\n` +
      `+${formatNumber(bet)}⭐ для победителя\n` +
      `-${formatNumber(bet)}⭐ для проигравшего`
    );
  }
  
  // marry @user (текстом)
  if (text.match(/^marry\s+@(\w+)/) || text.match(/^жениться\s+@(\w+)/) || text.match(/^брак\s+@(\w+)/)) {
    const match = text.match(/@(\w+)/)!;
    const targetUsername = match[1];
    const [targetUser] = await db.select().from(users).where(eq(users.username, targetUsername));
    if (!targetUser) return await ctx.reply('❌ Пользователь не найден');
    
    const [existingMarriage] = await db.select().from(marriages)
      .where(or(eq(marriages.user1Id, user.id), eq(marriages.user2Id, user.id)))
      .limit(1);
    
    if (existingMarriage) return await ctx.reply('❌ Вы уже женаты');
    
    const [targetMarriage] = await db.select().from(marriages)
      .where(or(eq(marriages.user1Id, targetUser.id), eq(marriages.user2Id, targetUser.id)))
      .limit(1);
    
    if (targetMarriage) return await ctx.reply('❌ @' + targetUsername + ' уже женат(а)');
    
    await db.insert(marriages).values({
      user1Id: user.id,
      user2Id: targetUser.id,
    });
    
    return await ctx.replyWithHTML(`💍 <b>@${user.username} и @${targetUsername} теперь женаты!</b>`);
  }
});

// ═══════════════════════════════════════════════════════════
// ЗАПУСК БОТА
// ═══════════════════════════════════════════════════════════

export function startBot() {
  bot.launch();
  console.log('🤖 VOIG BOT запущен!');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
