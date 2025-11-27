import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { users, marriages, duels, relationships, pendingProposals, chats, warnings } from '@shared/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_OWNER_ID = 7946808743; // ID владельца из инструкции
const BOT_OWNER_USERNAME = "n777snickers777";

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
}

const bot = new Telegraf(BOT_TOKEN);

// Хелперы
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const ANIMALS = ["cat", "dog", "cow", "fox", "wolf", "bear", "rabbit", "tiger"];
const ANIMAL_EMOJIS: Record<string, string> = {
  cat: "🐱", dog: "🐕", cow: "🐄", fox: "🦊",
  wolf: "🐺", bear: "🐻", rabbit: "🐰", tiger: "🐯"
};

// Получить или создать пользователя
async function getOrCreateUser(ctx: Context) {
  if (!ctx.from) return null;
  
  const telegramId = ctx.from.id;
  let [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  
  if (!user) {
    [user] = await db.insert(users).values({
      telegramId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      lastName: ctx.from.last_name || null,
      balance: 1000, // Стартовый баланс
    }).returning();
  } else {
    // Обновляем последнюю активность
    await db.update(users)
      .set({ 
        lastActive: new Date(),
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
      })
      .where(eq(users.id, user.id));
  }
  
  return user;
}

// Проверка владельца
function isOwner(userId: number): boolean {
  return userId === BOT_OWNER_ID;
}

// ═══════════════════════════════════════════════════════════
// ОСНОВНЫЕ КОМАНДЫ
// ═══════════════════════════════════════════════════════════

bot.command('start', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  await ctx.replyWithHTML(
    `👋 <b>Добро пожаловать в VOIG BOT!</b>\n\n` +
    `🎮 Бот для развлечений и экономики в Telegram.\n\n` +
    `💰 Стартовый баланс: <b>${formatNumber(user.balance)} ⭐</b>\n` +
    `📋 Команды: /help\n` +
    `👤 Профиль: /profile\n\n` +
    `<i>Развлекайтесь и зарабатывайте звёзды!</i>`
  );
});

bot.command('help', async (ctx) => {
  await ctx.replyWithHTML(
    `📋 <b>КОМАНДЫ VOIG BOT</b>\n\n` +
    `<b>🔵 ОСНОВНЫЕ:</b>\n` +
    `/start - начать работу с ботом\n` +
    `/help - список всех команд\n` +
    `/profile - ваш профиль\n` +
    `/balance - показать баланс\n` +
    `/daily - ежедневный бонус\n\n` +
    
    `<b>💰 ЭКОНОМИКА:</b>\n` +
    `баланс - показать баланс\n` +
    `бонус / дейли - получить бонус\n` +
    `отправить [сумма] @username - перевести звёзды\n\n` +
    
    `<b>🎮 ИГРЫ:</b>\n` +
    `/roll - бросить кубик\n` +
    `/dice - ещё кубик\n` +
    `/slots - слот машина\n` +
    `/fish - рыбалка\n` +
    `/duel @user [ставка] - вызов на дуэль\n\n` +
    
    `<b>💕 ОТНОШЕНИЯ:</b>\n` +
    `/marry @user - предложить брак\n` +
    `/divorce - развестись\n` +
    `/dating @user - начать отношения\n` +
    `/breakup - расстаться\n\n` +
    
    `<b>🎭 РОЛЕВЫЕ:</b>\n` +
    `/hug @user - обнять\n` +
    `/kiss @user - поцеловать\n` +
    `/hit @user - ударить\n\n` +
    
    `<b>🐾 ПРЕВРАЩЕНИЯ:</b>\n` +
    `/transform [животное] - превратиться\n` +
    `Доступно: cat, dog, cow, fox, wolf, bear\n\n` +
    
    `<b>🏆 РЕЙТИНГИ:</b>\n` +
    `/top_rich - топ богачей\n` +
    `/top_reputation - топ репутации\n` +
    `/stats - статистика бота\n\n` +
    
    `<b>⚙️ МОДЕРАЦИЯ (для админов):</b>\n` +
    `/ban @user - забанить\n` +
    `/kick @user - выгнать\n` +
    `/mute @user [минуты] - замутить\n` +
    `/warn @user - предупреждение`
  );
});

bot.command('profile', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  // Проверка брака
  const [marriage] = await db.select().from(marriages)
    .where(or(
      eq(marriages.user1Id, user.id),
      eq(marriages.user2Id, user.id)
    ))
    .limit(1);
  
  let marriageText = "Нет";
  if (marriage) {
    const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;
    const [partner] = await db.select().from(users).where(eq(users.id, partnerId));
    marriageText = partner ? `@${partner.username || partner.firstName}` : "Неизвестно";
  }
  
  // Проверка превращения
  let transformText = "";
  if (user.transformAnimal && user.transformUntil && new Date(user.transformUntil) > new Date()) {
    const emoji = ANIMAL_EMOJIS[user.transformAnimal] || "🦊";
    transformText = `\n🐾 Превращение: ${emoji} ${user.transformAnimal}`;
  }
  
  const premiumText = user.isPremium ? "✨ ПРЕМИУМ" : "Обычный";
  
  await ctx.replyWithHTML(
    `👤 <b>ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ</b>\n\n` +
    `🆔 ID: <code>${user.telegramId}</code>\n` +
    `👤 Имя: ${escapeHtml(user.firstName || "Нет")}\n` +
    `📛 Username: @${user.username || "нет"}\n\n` +
    `💰 Баланс: <b>${formatNumber(user.balance)} ⭐</b>\n` +
    `🏆 Репутация: <b>${user.reputation}</b>\n` +
    `💍 В браке с: ${marriageText}\n` +
    `✨ Статус: ${premiumText}${transformText}`
  );
});

bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  await ctx.replyWithHTML(
    `💰 <b>Ваш баланс:</b> ${formatNumber(user.balance)} ⭐`
  );
});

bot.command('daily', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const now = new Date();
  const lastDaily = user.dailyBonusAt ? new Date(user.dailyBonusAt) : null;
  
  // Проверка: прошло ли 24 часа
  if (lastDaily) {
    const hoursSince = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince);
      return await ctx.replyWithHTML(
        `⏰ Вы уже получали ежедневный бонус!\n` +
        `Приходите через <b>${hoursLeft}ч</b>`
      );
    }
  }
  
  const bonus = user.isPremium ? 1000 : 500;
  await db.update(users)
    .set({
      balance: user.balance + bonus,
      dailyBonusAt: now,
    })
    .where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `🎁 <b>Ежедневный бонус получен!</b>\n\n` +
    `💰 +${formatNumber(bonus)} ⭐\n` +
    `📊 Новый баланс: ${formatNumber(user.balance + bonus)} ⭐\n\n` +
    `${user.isPremium ? "✨ Премиум бонус x2!" : "💡 С премиумом бонус x2!"}`
  );
});

// ═══════════════════════════════════════════════════════════
// ИГРЫ
// ═══════════════════════════════════════════════════════════

bot.command('roll', async (ctx) => {
  const dice = randomInt(1, 6);
  await ctx.replyWithHTML(`🎲 Выпало: <b>${dice}</b>`);
});

bot.command('dice', async (ctx) => {
  await ctx.replyWithDice();
});

bot.command('slots', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const bet = 100;
  if (user.balance < bet) {
    return await ctx.reply("💸 Недостаточно звёзд! Ставка: 100 ⭐");
  }
  
  const slot1 = randomInt(1, 3);
  const slot2 = randomInt(1, 3);
  const slot3 = randomInt(1, 3);
  
  const emojis = ["🍒", "🍋", "⭐"];
  const result = `${emojis[slot1 - 1]} ${emojis[slot2 - 1]} ${emojis[slot3 - 1]}`;
  
  let winnings = 0;
  if (slot1 === slot2 && slot2 === slot3) {
    winnings = bet * 5; // Джекпот!
  } else if (slot1 === slot2 || slot2 === slot3) {
    winnings = bet * 2; // Частичный выигрыш
  }
  
  const newBalance = user.balance - bet + winnings;
  await db.update(users)
    .set({ balance: newBalance })
    .where(eq(users.id, user.id));
  
  if (winnings > 0) {
    await ctx.replyWithHTML(
      `🎰 ${result}\n\n` +
      `🎉 <b>ВЫИГРЫШ!</b> +${formatNumber(winnings - bet)} ⭐\n` +
      `💰 Баланс: ${formatNumber(newBalance)} ⭐`
    );
  } else {
    await ctx.replyWithHTML(
      `🎰 ${result}\n\n` +
      `😢 Проигрыш! -${bet} ⭐\n` +
      `💰 Баланс: ${formatNumber(newBalance)} ⭐`
    );
  }
});

bot.command('fish', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const caught = randomInt(10, 200);
  await db.update(users)
    .set({ balance: user.balance + caught })
    .where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `🎣 <b>Рыбалка!</b>\n\n` +
    `Вы поймали рыбу на <b>${caught} ⭐</b>\n` +
    `💰 Баланс: ${formatNumber(user.balance + caught)} ⭐`
  );
});

// ═══════════════════════════════════════════════════════════
// РЕЙТИНГИ
// ═══════════════════════════════════════════════════════════

bot.command('top_rich', async (ctx) => {
  const topUsers = await db.select()
    .from(users)
    .orderBy(desc(users.balance))
    .limit(10);
  
  let text = "💰 <b>ТОП-10 БОГАЧЕЙ</b>\n\n";
  topUsers.forEach((u: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    text += `${medal} @${u.username || u.firstName} - ${formatNumber(u.balance)} ⭐\n`;
  });
  
  await ctx.replyWithHTML(text);
});

bot.command('top_reputation', async (ctx) => {
  const topUsers = await db.select()
    .from(users)
    .orderBy(desc(users.reputation))
    .limit(10);
  
  let text = "🏆 <b>ТОП-10 РЕПУТАЦИИ</b>\n\n";
  topUsers.forEach((u: any, i: number) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    text += `${medal} @${u.username || u.firstName} - ${u.reputation} 🏆\n`;
  });
  
  await ctx.replyWithHTML(text);
});

bot.command('stats', async (ctx) => {
  const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [totalBalanceResult] = await db.select({ sum: sql<number>`sum(balance)` }).from(users);
  const [totalMarriagesResult] = await db.select({ count: sql<number>`count(*)` }).from(marriages);
  
  await ctx.replyWithHTML(
    `📊 <b>СТАТИСТИКА VOIG BOT</b>\n\n` +
    `👥 Пользователей: <b>${totalUsersResult.count}</b>\n` +
    `💰 Общая экономика: <b>${formatNumber(totalBalanceResult.sum || 0)} ⭐</b>\n` +
    `💍 Браков: <b>${totalMarriagesResult.count}</b>\n` +
    `🤖 Версия: <b>2.4.0</b>`
  );
});

// ═══════════════════════════════════════════════════════════
// БРАКИ И ОТНОШЕНИЯ
// ═══════════════════════════════════════════════════════════

bot.command('marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user || !ctx.chat) return;
  
  const mentioned = ctx.message.entities?.find(e => e.type === 'mention');
  if (!mentioned) {
    return await ctx.reply("❌ Укажите пользователя: /marry @username");
  }
  
  const mentionedUsername = ctx.message.text.slice(mentioned.offset + 1, mentioned.offset + mentioned.length);
  const [targetUser] = await db.select().from(users).where(eq(users.username, mentionedUsername));
  
  if (!targetUser) {
    return await ctx.reply("❌ Пользователь не найден в базе данных");
  }
  
  if (targetUser.id === user.id) {
    return await ctx.reply("❌ Вы не можете жениться на себе!");
  }
  
  // Проверка существующих браков
  const [existingMarriage] = await db.select().from(marriages)
    .where(or(
      and(eq(marriages.user1Id, user.id)),
      and(eq(marriages.user2Id, user.id)),
      and(eq(marriages.user1Id, targetUser.id)),
      and(eq(marriages.user2Id, targetUser.id))
    ));
  
  if (existingMarriage) {
    return await ctx.reply("❌ Один из вас уже в браке!");
  }
  
  // Создаем предложение
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут
  await db.insert(pendingProposals).values({
    type: 'marry',
    fromUserId: user.id,
    toUserId: targetUser.id,
    chatId: ctx.chat.id,
    expiresAt,
  });
  
  await ctx.replyWithHTML(
    `💍 <b>@${user.username || user.firstName}</b> делает предложение <b>@${targetUser.username || targetUser.firstName}!</b>\n\n` +
    `Для принятия используйте: /accept_marry\n` +
    `Действительно 5 минут`
  );
});

bot.command('accept_marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user || !ctx.chat) return;
  
  const [proposal] = await db.select().from(pendingProposals)
    .where(and(
      eq(pendingProposals.toUserId, user.id),
      eq(pendingProposals.type, 'marry'),
      eq(pendingProposals.chatId, ctx.chat.id)
    ))
    .orderBy(desc(pendingProposals.createdAt))
    .limit(1);
  
  if (!proposal) {
    return await ctx.reply("❌ Нет активных предложений брака");
  }
  
  if (new Date() > new Date(proposal.expiresAt)) {
    await db.delete(pendingProposals).where(eq(pendingProposals.id, proposal.id));
    return await ctx.reply("❌ Предложение истекло");
  }
  
  const [proposer] = await db.select().from(users).where(eq(users.id, proposal.fromUserId));
  if (!proposer) return;
  
  // Создаем брак
  await db.insert(marriages).values({
    user1Id: proposal.fromUserId,
    user2Id: proposal.toUserId,
    chatId: ctx.chat.id,
  });
  
  // Удаляем предложение
  await db.delete(pendingProposals).where(eq(pendingProposals.id, proposal.id));
  
  await ctx.replyWithHTML(
    `💖 <b>Поздравляем!</b>\n\n` +
    `@${proposer.username || proposer.firstName} и @${user.username || user.firstName} теперь в браке! 💍`
  );
});

bot.command('divorce', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [marriage] = await db.select().from(marriages)
    .where(or(
      eq(marriages.user1Id, user.id),
      eq(marriages.user2Id, user.id)
    ));
  
  if (!marriage) {
    return await ctx.reply("❌ Вы не состоите в браке");
  }
  
  await db.delete(marriages).where(eq(marriages.id, marriage.id));
  
  await ctx.reply("💔 Развод оформлен. Брак расторгнут.");
});

bot.command('dating', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user || !ctx.chat) return;
  
  const mentioned = ctx.message.entities?.find(e => e.type === 'mention');
  if (!mentioned) {
    return await ctx.reply("❌ Укажите пользователя: /dating @username");
  }
  
  const mentionedUsername = ctx.message.text.slice(mentioned.offset + 1, mentioned.offset + mentioned.length);
  const [targetUser] = await db.select().from(users).where(eq(users.username, mentionedUsername));
  
  if (!targetUser) {
    return await ctx.reply("❌ Пользователь не найден");
  }
  
  await db.insert(relationships).values({
    user1Id: user.id,
    user2Id: targetUser.id,
    chatId: ctx.chat.id,
  });
  
  await ctx.replyWithHTML(
    `💕 <b>@${user.username || user.firstName}</b> и <b>@${targetUser.username || targetUser.firstName}</b> начали отношения!`
  );
});

bot.command('breakup', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [relationship] = await db.select().from(relationships)
    .where(or(
      eq(relationships.user1Id, user.id),
      eq(relationships.user2Id, user.id)
    ));
  
  if (!relationship) {
    return await ctx.reply("❌ Вы не состоите в отношениях");
  }
  
  await db.delete(relationships).where(eq(relationships.id, relationship.id));
  
  await ctx.reply("💔 Отношения прекращены.");
});

// ═══════════════════════════════════════════════════════════
// РОЛЕВЫЕ КОМАНДЫ (RP)
// ═══════════════════════════════════════════════════════════

const rpActions: Record<string, string> = {
  hug: "обнял(а)",
  kiss: "поцеловал(а)",
  hit: "ударил(а)",
  pat: "погладил(а)",
  slap: "шлёпнул(а)",
};

bot.command('hug', async (ctx) => await handleRpAction(ctx, 'hug', '🤗'));
bot.command('kiss', async (ctx) => await handleRpAction(ctx, 'kiss', '💋'));
bot.command('hit', async (ctx) => await handleRpAction(ctx, 'hit', '👊'));

async function handleRpAction(ctx: any, action: string, emoji: string) {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const mentioned = ctx.message.entities?.find((e: any) => e.type === 'mention' || e.type === 'text_mention');
  if (!mentioned) {
    return await ctx.reply(`❌ Укажите пользователя: /${action} @username`);
  }
  
  let targetName = "кого-то";
  if (mentioned.type === 'mention') {
    const mentionedUsername = ctx.message.text.slice(mentioned.offset + 1, mentioned.offset + mentioned.length);
    targetName = `@${mentionedUsername}`;
  } else if (mentioned.user) {
    targetName = `@${mentioned.user.username || mentioned.user.first_name}`;
  }
  
  const actionText = rpActions[action] || action;
  await ctx.replyWithHTML(
    `${emoji} <b>@${user.username || user.firstName}</b> ${actionText} <b>${targetName}</b>`
  );
}

// ═══════════════════════════════════════════════════════════
// ПРЕВРАЩЕНИЯ
// ═══════════════════════════════════════════════════════════

bot.command('transform', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    return await ctx.replyWithHTML(
      `🐾 <b>Превращения доступны:</b>\n\n` +
      ANIMALS.map(a => `${ANIMAL_EMOJIS[a]} ${a}`).join('\n') +
      `\n\nИспользуйте: /transform [животное]`
    );
  }
  
  const animal = args[0].toLowerCase();
  if (!ANIMALS.includes(animal)) {
    return await ctx.reply("❌ Такое животное недоступно!");
  }
  
  const cost = 100;
  if (user.balance < cost) {
    return await ctx.reply(`❌ Недостаточно звёзд! Нужно: ${cost} ⭐`);
  }
  
  const transformUntil = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 часа
  await db.update(users)
    .set({
      balance: user.balance - cost,
      transformAnimal: animal,
      transformUntil,
    })
    .where(eq(users.id, user.id));
  
  const emoji = ANIMAL_EMOJIS[animal];
  await ctx.replyWithHTML(
    `${emoji} <b>Превращение!</b>\n\n` +
    `Вы превратились в: <b>${animal}</b>\n` +
    `Длительность: 4 часа\n` +
    `Стоимость: -${cost} ⭐`
  );
});

// ═══════════════════════════════════════════════════════════
// МОДЕРАЦИЯ
// ═══════════════════════════════════════════════════════════

bot.command('ban', async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') {
    return await ctx.reply("❌ Команда работает только в группах");
  }
  
  try {
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some(a => a.user.id === ctx.from?.id);
    
    if (!isAdmin) {
      return await ctx.reply("❌ Только администраторы могут банить");
    }
    
    const mentioned = ctx.message.entities?.find(e => e.type === 'mention' || e.type === 'text_mention');
    if (!mentioned) {
      return await ctx.reply("❌ Укажите пользователя: /ban @username");
    }
    
    let userId: number | undefined;
    if (mentioned.type === 'text_mention' && mentioned.user) {
      userId = mentioned.user.id;
    }
    
    if (!userId) {
      return await ctx.reply("❌ Не удалось определить пользователя");
    }
    
    await ctx.banChatMember(userId);
    await ctx.reply("🚫 Пользователь забанен");
  } catch (e) {
    await ctx.reply("❌ Ошибка: не удалось забанить пользователя");
  }
});

bot.command('kick', async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') {
    return await ctx.reply("❌ Команда работает только в группах");
  }
  
  try {
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some(a => a.user.id === ctx.from?.id);
    
    if (!isAdmin) {
      return await ctx.reply("❌ Только администраторы могут кикать");
    }
    
    const mentioned = ctx.message.entities?.find(e => e.type === 'text_mention');
    if (!mentioned || !mentioned.user) {
      return await ctx.reply("❌ Укажите пользователя: /kick @username");
    }
    
    await ctx.banChatMember(mentioned.user.id);
    await ctx.unbanChatMember(mentioned.user.id);
    await ctx.reply("👢 Пользователь выгнан из группы");
  } catch (e) {
    await ctx.reply("❌ Ошибка: не удалось выгнать пользователя");
  }
});

bot.command('warn', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user || !ctx.chat || ctx.chat.type === 'private') return;
  
  const mentioned = ctx.message.entities?.find(e => e.type === 'mention');
  if (!mentioned) {
    return await ctx.reply("❌ Укажите пользователя: /warn @username");
  }
  
  const mentionedUsername = ctx.message.text.slice(mentioned.offset + 1, mentioned.offset + mentioned.length);
  const [targetUser] = await db.select().from(users).where(eq(users.username, mentionedUsername));
  
  if (!targetUser) {
    return await ctx.reply("❌ Пользователь не найден");
  }
  
  await db.insert(warnings).values({
    userId: targetUser.id,
    chatId: ctx.chat.id,
    issuedBy: user.id,
    reason: "Нарушение правил",
  });
  
  const warningCount = await db.select({ count: sql<number>`count(*)` })
    .from(warnings)
    .where(and(
      eq(warnings.userId, targetUser.id),
      eq(warnings.chatId, ctx.chat.id)
    ));
  
  await ctx.replyWithHTML(
    `⚠️ <b>@${targetUser.username || targetUser.firstName}</b> получил предупреждение!\n` +
    `Всего предупреждений: ${warningCount[0].count}`
  );
});

// ═══════════════════════════════════════════════════════════
// ТЕКСТОВЫЕ КОМАНДЫ (без /)
// ═══════════════════════════════════════════════════════════

bot.on(message('text'), async (ctx, next) => {
  const text = ctx.message.text.toLowerCase();
  const user = await getOrCreateUser(ctx);
  if (!user) return next();
  
  // баланс
  if (text.match(/^баланс$/i)) {
    return await ctx.replyWithHTML(
      `💰 <b>Ваш баланс:</b> ${formatNumber(user.balance)} ⭐`
    );
  }
  
  // бонус / дейли
  if (text.match(/^(бонус|дейли)$/i)) {
    return ctx.telegram.callApi('sendMessage', {
      chat_id: ctx.chat.id,
      text: 'Используйте команду /daily для получения бонуса',
    });
  }
  
  // денги [число] - только для владельца
  if (text.match(/^денги\s+(\d+)$/i)) {
    if (!isOwner(ctx.from.id)) {
      return await ctx.reply("🚫 Эта команда только для владельца бота!");
    }
    
    const amount = parseInt(text.match(/^денги\s+(\d+)$/i)![1]);
    await db.update(users)
      .set({ balance: user.balance + amount })
      .where(eq(users.id, user.id));
    
    return await ctx.replyWithHTML(
      `💎 <b>Владелец выдал себе:</b> +${formatNumber(amount)} ⭐\n` +
      `💰 Новый баланс: ${formatNumber(user.balance + amount)} ⭐`
    );
  }
  
  // реклама : текст - только для владельца
  if (text.match(/^реклама\s*:\s*(.+)$/i)) {
    if (!isOwner(ctx.from.id)) {
      return await ctx.reply("🚫 Эта команда только для владельца бота!");
    }
    
    const adText = text.match(/^реклама\s*:\s*(.+)$/i)![1];
    const allUsers = await db.select().from(users);
    
    let sent = 0;
    for (const targetUser of allUsers) {
      try {
        await ctx.telegram.sendMessage(
          targetUser.telegramId,
          `📢 <b>ОБЪЯВЛЕНИЕ</b>\n\n${escapeHtml(adText)}`,
          { parse_mode: 'HTML' }
        );
        sent++;
      } catch (e) {
        // Пользователь заблокировал бота
      }
    }
    
    return await ctx.reply(`📤 Рассылка отправлена ${sent} пользователям!`);
  }

  // RP текстовые команды
  const rpTextCommands: Record<string, { emoji: string; action: string }> = {
    обнять: { emoji: "🤗", action: "обнял(а)" },
    целовать: { emoji: "💋", action: "поцеловал(а)" },
    поцеловать: { emoji: "💋", action: "поцеловал(а)" },
    бить: { emoji: "👊", action: "ударил(а)" },
    ударить: { emoji: "👊", action: "ударил(а)" },
    гладить: { emoji: "🤚", action: "погладил(а)" },
    шлепать: { emoji: "👋", action: "шлёпнул(а)" },
    лизать: { emoji: "👅", action: "облизал(а)" },
    кусать: { emoji: "🦷", action: "укусил(а)" },
    выебать: { emoji: "🔞", action: "выебал(а)" },
    трахать: { emoji: "🔞", action: "трахал(а)" },
    сосать: { emoji: "🍆", action: "сосал(а)" },
    ебать: { emoji: "🔞", action: "ебал(а)" },
    задрочить: { emoji: "💦", action: "задрочил(а)" },
    доминировать: { emoji: "👑", action: "доминирует над" },
    подчиняться: { emoji: "🙇", action: "подчиняется" },
    связать: { emoji: "🔗", action: "связал(а)" },
    приковать: { emoji: "⛓️", action: "приковал(а)" },
  };

  for (const [cmd, { emoji, action }] of Object.entries(rpTextCommands)) {
    const pattern = new RegExp(`^${cmd}(?:\\s+@([\\w]+))?$`, 'i');
    const match = text.match(pattern);
    
    if (match) {
      let targetName = "кого-то";
      
      // Проверяем если это ответ на сообщение
      if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
        const repliedUser = ctx.message.reply_to_message.from;
        targetName = `@${repliedUser.username || repliedUser.first_name}`;
      } else if (match[1]) {
        // Иначе используем указанный username
        targetName = `@${match[1]}`;
      }
      
      return await ctx.replyWithHTML(
        `${emoji} <b>@${user.username || user.firstName}</b> ${action} <b>${targetName}</b>`
      );
    }
  }
  
  return next();
});

// ═══════════════════════════════════════════════════════════
// ЗАПУСК БОТА
// ═══════════════════════════════════════════════════════════

export function startBot() {
  bot.launch();
  console.log('🤖 VOIG BOT запущен!');
  
  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
