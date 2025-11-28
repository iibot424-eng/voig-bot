import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { users, marriages, duels, relationships, pendingProposals, chats, warnings, businesses, mutes, bans, inventory, premiumPurchases, currencyPurchases } from '@shared/schema';
import { eq, and, or, desc, sql, lt } from 'drizzle-orm';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_OWNER_ID = 7977020467; // @n777snickers777
const BOT_OWNER_USERNAME = "n777snickers777";
const TRANSFORM_COOLDOWN_HOURS = 24;
const TRANSFORM_DURATION_HOURS = 4;
const PREMIUM_COST_STARS = 200;
const WEEKLY_BONUS_POINTS = 10000;

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
  let [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  
  if (!user) {
    [user] = await db.insert(users).values({
      telegramId, username: ctx.from.username || null, firstName: ctx.from.first_name || null,
      lastName: ctx.from.last_name || null, balance: 1000,
    }).returning();
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

// RP действия
const rpActions: Record<string, string> = {
  обнять: "🤗", целовать: "💋", поцеловать: "💋", бить: "👊", ударить: "👊", гладить: "🤚",
  шлепать: "👋", лизать: "👅", кусать: "🦷", выебать: "🔞", трахать: "🔞", ебать: "🔞",
  сосать: "🍆", задрочить: "💦", дрочить: "💦", доминировать: "👑", подчиняться: "🙏", связать: "🔗", приковать: "⛓️",
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
  const actionText = rpActions[actionKey] || emoji;
  await ctx.reply(
    `${emoji} <b>@${user.username || user.firstName}</b> ${actionKey}(а) <b>@${targetUser.username || targetUser.first_name}</b> ${actionText}`,
    { parse_mode: 'HTML' }
  );
}

// Проверить лимит трансформации
async function checkTransformCooldown(user: any): Promise<{ canTransform: boolean; message?: string }> {
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
    `🎮 Бот для развлечений, экономики и RP в Telegram.\n\n` +
    `💰 Стартовый баланс: <b>${formatNumber(user.balance)} ⭐</b>\n` +
    `${user.isPremium ? '✨ Статус: <b>ПРЕМИУМ</b>' : '⚪ Статус: <b>ОБЫЧНЫЙ</b>'}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔵 Основные команды', 'menu_main')],
      [Markup.button.callback('🎭 RP команды', 'menu_rp')],
      [Markup.button.callback('💍 Браки', 'menu_marry')],
      [Markup.button.callback('👤 Информация об пользователях', 'menu_info')],
      [Markup.button.callback('💎 Купить премиум', 'menu_premium')],
    ])
  );
});

// Меню кнопки
bot.action('menu_main', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🔵 <b>ОСНОВНЫЕ КОМАНДЫ:</b>\n\n` +
    `/help - полный список команд\n` +
    `/profile - ваш профиль\n` +
    `/balance - баланс\n` +
    `/daily - ежедневный бонус\n` +
    `/weekly - еженедельный бонус (премиум)\n\n` +
    `<b>💰 ЭКОНОМИКА:</b>\n` +
    `баланс - показать баланс\n` +
    `отправить [сумма] @user - перевести ⭐\n` +
    `топ_богачей - топ 10\n\n` +
    `<b>🎮 ИГРЫ:</b>\n` +
    `/roll - кубик (1-6)\n` +
    `/dice - ещё кубик\n` +
    `/slots - слот машина (50⭐)\n` +
    `/fish - рыбалка (50⭐)\n` +
    `/duel @user [ставка] - дуэль`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_rp', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🎭 <b>RP КОМАНДЫ (32+):</b>\n\n` +
    `обнять, целовать, поцеловать, бить, ударить, гладить, шлепать,\n` +
    `лизать, кусать, выебать, трахать, ебать, сосать, задрочить, дрочить,\n` +
    `доминировать, подчиняться, связать, приковать\n\n` +
    `<i>Ответьте на сообщение пользователя и напишите команду без /</i>\n` +
    `Или используйте: команда @username`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_marry', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💍 <b>ОТНОШЕНИЯ И БРАКИ:</b>\n\n` +
    `/marry @user - предложить брак\n` +
    `/accept_marry - принять\n` +
    `/divorce - развестись\n` +
    `/dating @user - начать отношения\n` +
    `/breakup - расстаться`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_info', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `👤 <b>ИНФОРМАЦИЯ ОБ ПОЛЬЗОВАТЕЛЯХ:</b>\n\n` +
    `/profile - ваш профиль\n` +
    `/профиль - профиль на русском\n` +
    `/ид - ваш Telegram ID\n` +
    `/top_rich - топ богачей\n` +
    `/stats - статистика бота`,
    { parse_mode: 'HTML' }
  );
});

bot.action('menu_premium', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💎 <b>ПРЕМИУМ СИСТЕМА:</b>\n\n` +
    `<b>Стоимость:</b> 200 Telegram Stars ⭐\n` +
    `<b>Преимущества:</b>\n` +
    `  • Повышенный ежедневный бонус (1000 вместо 500)\n` +
    `  • Еженедельный бонус: 10,000 пойнтов\n` +
    `  • Трансформации животных\n` +
    `  • Другие эксклюзивные команды\n\n` +
    `Используйте: /buy_premium`,
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

// Еженедельный бонус для премиум
bot.command('weekly', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  if (!user.isPremium) {
    return await ctx.reply('❌ Эта команда только для премиум пользователей! Купите премиум: /buy_premium');
  }
  
  const now = new Date();
  const lastWeekly = user.lastWeeklyBonusAt ? new Date(user.lastWeeklyBonusAt) : null;
  
  if (lastWeekly) {
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
    `📋 <b>КОМАНДЫ:</b>\n\n` +
    `/start - меню\n` +
    `/profile - профиль\n` +
    `/balance - баланс\n` +
    `/daily - ежедневный бонус\n` +
    `/weekly - еженедельный бонус (премиум)\n` +
    `/roll /dice - кубик\n` +
    `/slots - слот машина\n` +
    `/fish - рыбалка\n` +
    `/duel @user - дуэль\n` +
    `/marry @user - брак\n` +
    `/divorce - развод\n` +
    `/buy_premium - купить премиум\n` +
    `/top_rich - топ богачей\n` +
    `/профиль /ид - профиль (RU)`
  );
});

bot.command('profile', async (ctx) => {
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
  
  const now = new Date();
  const lastDaily = user.dailyBonusAt ? new Date(user.dailyBonusAt) : null;
  
  if (lastDaily) {
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
  if (user.balance < 50) return await ctx.reply('❌ Нужно 50⭐');
  
  const fish = ['🐟', '🐠', '🐡', '🦈'];
  const caught = fish[randomInt(0, 3)];
  const win = randomInt(50, 500);
  const newBalance = user.balance - 50 + win;
  
  await db.update(users).set({ balance: newBalance }).where(eq(users.id, user.id));
  await ctx.replyWithHTML(`${caught} Поймали! +${win}⭐`);
});

bot.command('transform', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const { canTransform, message: msg } = await checkTransformCooldown(user);
  if (!canTransform) {
    return await ctx.replyWithHTML(msg!);
  }
  
  const args = ctx.message.text.split(' ');
  const animal = args[1]?.toLowerCase();
  
  if (!animal || !ANIMALS.includes(animal)) {
    return await ctx.reply(`❌ Животное не найдено. Доступны: ${ANIMALS.join(', ')}`);
  }
  
  if (user.balance < 500) return await ctx.reply('❌ Нужно 500⭐');
  
  const transformUntil = new Date(Date.now() + TRANSFORM_DURATION_HOURS * 60 * 60 * 1000);
  await db.update(users).set({
    balance: user.balance - 500,
    transformAnimal: animal,
    transformUntil,
    lastTransformAt: new Date(),
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `${ANIMAL_EMOJIS[animal]} <b>Превращение!</b>\n\n` +
    `Животное: <b>${animal}</b>\n` +
    `Длительность: 4 часа\n` +
    `Стоимость: -500⭐`
  );
});

// ОТНОШЕНИЯ
bot.command('marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
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
  
  await ctx.replyWithHTML(`💍 Предложение брака отправлено @${targetUser.username}!\nОн может принять: /accept_marry`);
});

bot.command('accept_marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [proposal] = await db.select().from(pendingProposals)
    .where(and(eq(pendingProposals.type, 'marry'), eq(pendingProposals.toUserId, user.id)))
    .limit(1);
  
  if (!proposal) return await ctx.reply('❌ Нет предложений');
  
  await db.insert(marriages).values({
    user1Id: proposal.fromUserId, user2Id: user.id, chatId: proposal.chatId,
  });
  
  await db.delete(pendingProposals).where(eq(pendingProposals.id, proposal.id));
  await ctx.reply('💍 ПОЗДРАВЛЯЕМ С БРАКОМ! 🎉');
});

bot.command('divorce', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [marriage] = await db.select().from(marriages)
    .where(or(eq(marriages.user1Id, user.id), eq(marriages.user2Id, user.id)))
    .limit(1);
  
  if (!marriage) return await ctx.reply('❌ Вы не в браке');
  await db.delete(marriages).where(eq(marriages.id, marriage.id));
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
  const topUsers = await db.select().from(users).orderBy(desc(users.balance)).limit(10);
  const list = topUsers.map((u, i) => `${i + 1}. @${u.username || u.firstName} - ${formatNumber(u.balance)}⭐`).join('\n');
  await ctx.replyWithHTML(`🏆 <b>ТОП 10:</b>\n\n${list}`);
});

bot.command('профиль', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  await ctx.replyWithHTML(
    `👤 <b>ПРОФИЛЬ</b>\n` +
    `ID: ${user.telegramId}\n` +
    `@${user.username}\n` +
    `💰 ${formatNumber(user.balance)}⭐\n` +
    `✨ ${user.isPremium ? 'ПРЕМИУМ' : 'Обычный'}`
  );
});

bot.command('ид', async (ctx) => {
  await ctx.reply(`🆔 Ваш ID: <code>${ctx.from?.id}</code>`, { parse_mode: 'HTML' });
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
