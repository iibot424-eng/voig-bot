import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { users, marriages, duels, relationships, pendingProposals, chats, warnings } from '@shared/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_OWNER_ID = 7977020467; // @n777snickers777
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
const ANIMAL_SOUNDS: Record<string, string> = {
  cat: "мяу",
  dog: "гав",
  cow: "муу",
  fox: "не-не",
  wolf: "у-у-у",
  bear: "рррр",
  rabbit: "писк",
  tiger: "рррык"
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

// RP действия
const rpActions: Record<string, string> = {
  hug: "обнял(а)",
  kiss: "поцеловал(а)",
  hit: "ударил(а)",
};

// ═══════════════════════════════════════════════════════════
// ОСНОВНЫЕ КОМАНДЫ
// ═══════════════════════════════════════════════════════════

bot.command('start', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const rpCommandsText = `
🎭 <b>RP КОМАНДЫ (ТЕКСТОВЫЕ):</b>
обнять, целовать, бить, гладить, шлепать, лизать, кусать, выебать, трахать, сосать, ебать, задрочить, доминировать, подчиняться, связать, приковать

<b>Примеры:</b>
обнять
целовать @username
бить @username

<i>Или ответьте на сообщение и напишите команду</i>
  `.trim();

  await ctx.replyWithHTML(
    `👋 <b>Добро пожаловать в VOIG BOT!</b>\n\n` +
    `🎮 Бот для развлечений и экономики в Telegram.\n\n` +
    `💰 Стартовый баланс: <b>${formatNumber(user.balance)} ⭐</b>\n\n` +
    `${rpCommandsText}`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('📋 Все команды', 'help_commands'),
        Markup.button.callback('👤 Профиль', 'profile_view'),
      ],
      [
        Markup.button.callback('💰 Баланс', 'balance_view'),
        Markup.button.callback('🎮 Игры', 'games_view'),
      ],
      [
        Markup.button.callback('💍 Отношения', 'relations_view'),
        Markup.button.callback('🏆 Рейтинги', 'ratings_view'),
      ],
    ])
  );
});

// Обработчики кнопок
bot.action('help_commands', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📋 <b>КОМАНДЫ VOIG BOT</b>\n\n` +
    `<b>🔵 ОСНОВНЫЕ:</b>\n` +
    `/start - начать работу с ботом\n` +
    `/help - список всех команд\n` +
    `/profile - ваш профиль\n` +
    `/balance - показать баланс\n` +
    `/daily - ежедневный бонус\n\n` +
    
    `<b>💰 ЭКОНОМИКА:</b>\n` +
    `баланс - показать баланс\n` +
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
    
    `<b>🎭 РОЛЕВЫЕ (текстовые варианты):</b>\n` +
    `обнять, целовать, бить, гладить, шлепать, лизать, кусать, выебать, трахать, сосать, ебать, задрочить, доминировать, подчиняться, связать, приковать\n\n` +
    
    `<b>🐾 ПРЕВРАЩЕНИЯ:</b>\n` +
    `превратить - премиум команда (1/день)\n` +
    `Звук должен быть в начале каждого сообщения\n\n` +
    
    `<b>⚙️ МОДЕРАЦИЯ (текстовые варианты):</b>\n` +
    `бан @user\n` +
    `кик @user\n` +
    `предупреждение @user\n` +
    `мут @user`,
    { parse_mode: 'HTML' }
  );
});

bot.action('profile_view', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
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
  
  let transformText = "";
  if (user.transformAnimal && user.transformUntil && new Date(user.transformUntil) > new Date()) {
    const emoji = ANIMAL_EMOJIS[user.transformAnimal] || "🦊";
    transformText = `\n🐾 Превращение: ${emoji} ${user.transformAnimal}`;
  }
  
  const premiumText = user.isPremium ? "✨ ПРЕМИУМ" : "Обычный";
  
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `👤 <b>ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ</b>\n\n` +
    `🆔 ID: <code>${user.telegramId}</code>\n` +
    `👤 Имя: ${escapeHtml(user.firstName || "Нет")}\n` +
    `📛 Username: @${user.username || "нет"}\n\n` +
    `💰 Баланс: <b>${formatNumber(user.balance)} ⭐</b>\n` +
    `🏆 Репутация: <b>${user.reputation}</b>\n` +
    `💍 В браке с: ${marriageText}\n` +
    `✨ Статус: ${premiumText}${transformText}`,
    { parse_mode: 'HTML' }
  );
});

bot.action('balance_view', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💰 <b>Ваш баланс:</b> ${formatNumber(user.balance)} ⭐`,
    { parse_mode: 'HTML' }
  );
});

bot.action('games_view', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🎮 <b>ИГРЫ:</b>\n\n` +
    `/roll - бросить кубик (1-6)\n` +
    `/dice - ещё кубик\n` +
    `/slots - слот машина (50⭐ за игру)\n` +
    `/fish - рыбалка (50⭐ за попытку)\n` +
    `/duel @user [ставка] - вызов на дуэль\n\n` +
    `<i>Используйте команды с / для игр</i>`,
    { parse_mode: 'HTML' }
  );
});

bot.action('relations_view', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💕 <b>ОТНОШЕНИЯ:</b>\n\n` +
    `/marry @user - предложить брак\n` +
    `/accept_marry - принять предложение\n` +
    `/divorce - развестись\n` +
    `/dating @user - начать отношения\n` +
    `/breakup - расстаться\n\n` +
    `<i>Используйте команды с / для отношений</i>`,
    { parse_mode: 'HTML' }
  );
});

bot.action('ratings_view', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🏆 <b>РЕЙТИНГИ:</b>\n\n` +
    `/top_rich - топ богачей\n` +
    `/top_reputation - топ репутации\n` +
    `/stats - статистика бота\n\n` +
    `<i>Используйте команды с / для просмотра</i>`,
    { parse_mode: 'HTML' }
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
    `превратить - премиум (1/день)\n` +
    `/transform [животное] - платная версия\n` +
    `Доступные: cat, dog, cow, fox, wolf, bear\n\n` +
    
    `<b>🏆 РЕЙТИНГИ:</b>\n` +
    `/top_rich - топ богачей\n` +
    `/top_reputation - топ репутации\n` +
    `/stats - статистика бота\n\n` +
    
    `<b>⚙️ МОДЕРАЦИЯ (для админов):</b>\n` +
    `/ban @user - забанить\n` +
    `/kick @user - выгнать\n` +
    `/warn @user - предупреждение`
  );
});

bot.command('profile', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
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
    `✅ <b>Ежедневный бонус:</b> +${bonus} ⭐\n` +
    `💰 Новый баланс: ${formatNumber(user.balance + bonus)} ⭐`
  );
});

bot.command('roll', async (ctx) => {
  const roll = randomInt(1, 6);
  await ctx.reply(`🎲 Вы выбросили: <b>${roll}</b>`, { parse_mode: 'HTML' });
});

bot.command('dice', async (ctx) => {
  const roll = randomInt(1, 6);
  await ctx.reply(`🎲 Кубик показал: <b>${roll}</b>`, { parse_mode: 'HTML' });
});

bot.command('slots', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const cost = 50;
  if (user.balance < cost) {
    return await ctx.reply(`❌ Недостаточно звёзд! Нужно: ${cost} ⭐`);
  }
  
  const symbols = ['🍎', '🍌', '🍊', '🍓', '🍑'];
  const results = [
    symbols[randomInt(0, 4)],
    symbols[randomInt(0, 4)],
    symbols[randomInt(0, 4)],
  ];
  
  const won = results[0] === results[1] && results[1] === results[2];
  const win = won ? 500 : 0;
  const newBalance = user.balance - cost + win;
  
  await db.update(users)
    .set({ balance: newBalance })
    .where(eq(users.id, user.id));
  
  const resultText = won 
    ? `🎉 <b>ДЖЕКПОТ!</b> ${results.join(' ')} +${win} ⭐`
    : `😢 ${results.join(' ')} -${cost} ⭐`;
  
  await ctx.replyWithHTML(resultText);
});

bot.command('fish', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const cost = 50;
  if (user.balance < cost) {
    return await ctx.reply(`❌ Недостаточно звёзд! Нужно: ${cost} ⭐`);
  }
  
  const caught = Math.random() > 0.5;
  const fishEmojis = ['🐠', '🐟', '🦈', '🐙'];
  const fish = fishEmojis[randomInt(0, 3)];
  
  const win = caught ? 300 : 0;
  const newBalance = user.balance - cost + win;
  
  await db.update(users)
    .set({ balance: newBalance })
    .where(eq(users.id, user.id));
  
  const resultText = caught
    ? `🎣 <b>Поймали!</b> ${fish} +${win} ⭐`
    : `🎣 <b>Ничего не клюёт</b> -${cost} ⭐`;
  
  await ctx.replyWithHTML(resultText);
});

bot.command('top_rich', async (ctx) => {
  const topUsers = await db.select()
    .from(users)
    .orderBy(desc(users.balance))
    .limit(10);
  
  const list = topUsers.map((u, i) => 
    `${i + 1}. @${u.username || u.firstName} - ${formatNumber(u.balance)} ⭐`
  ).join('\n');
  
  await ctx.replyWithHTML(`🏆 <b>ТОП 10 БОГАЧЕЙ:</b>\n\n${list}`);
});

bot.command('top_reputation', async (ctx) => {
  const topUsers = await db.select()
    .from(users)
    .orderBy(desc(users.reputation))
    .limit(10);
  
  const list = topUsers.map((u, i) => 
    `${i + 1}. @${u.username || u.firstName} - ${u.reputation} репутации`
  ).join('\n');
  
  await ctx.replyWithHTML(`🏆 <b>ТОП 10 ПО РЕПУТАЦИИ:</b>\n\n${list}`);
});

bot.command('stats', async (ctx) => {
  const allUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
  const totalBalance = await db.select({ sum: sql<number>`sum(balance)` }).from(users);
  const marriagesData = await db.select({ count: sql<number>`count(*)` }).from(marriages);
  
  await ctx.replyWithHTML(
    `📊 <b>СТАТИСТИКА БОТА:</b>\n\n` +
    `👥 Пользователей: ${allUsers[0].count}\n` +
    `💰 Всего звёзд в обороте: ${formatNumber(totalBalance[0].sum || 0)} ⭐\n` +
    `💍 Браков: ${marriagesData[0].count}`
  );
});

bot.command('marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const mentioned = ctx.message.entities?.find(e => e.type === 'mention' || e.type === 'text_mention');
  if (!mentioned) {
    return await ctx.reply("❌ Укажите пользователя: /marry @username");
  }
  
  let targetUser;
  if (mentioned.type === 'text_mention' && mentioned.user) {
    const [found] = await db.select().from(users).where(eq(users.telegramId, mentioned.user.id));
    targetUser = found;
  } else {
    const username = ctx.message.text.slice(mentioned.offset + 1, mentioned.offset + mentioned.length);
    const [found] = await db.select().from(users).where(eq(users.username, username));
    targetUser = found;
  }
  
  if (!targetUser) {
    return await ctx.reply("❌ Пользователь не найден");
  }
  
  if (user.id === targetUser.id) {
    return await ctx.reply("❌ Не можете предложить брак сами себе!");
  }
  
  const [existing] = await db.select().from(pendingProposals)
    .where(and(
      or(
        eq(pendingProposals.fromUserId, user.id),
        eq(pendingProposals.toUserId, user.id)
      ),
      or(
        eq(pendingProposals.fromUserId, targetUser.id),
        eq(pendingProposals.toUserId, targetUser.id)
      )
    ))
    .limit(1);
  
  if (existing) {
    return await ctx.reply("❌ Уже есть предложение между вами!");
  }
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(pendingProposals).values({
    fromUserId: user.id,
    toUserId: targetUser.id,
    type: 'marriage',
    chatId: Number(ctx.chat?.id || 0),
    expiresAt,
  });
  
  await ctx.replyWithHTML(
    `💍 <b>@${user.username || user.firstName}</b> предложил(а) брак <b>@${targetUser.username || targetUser.firstName}</b>\n\n` +
    `Используйте /accept_marry для принятия или проигнорируйте предложение`
  );
});

bot.command('accept_marry', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [proposal] = await db.select().from(pendingProposals)
    .where(and(
      eq(pendingProposals.toUserId, user.id),
      eq(pendingProposals.type, 'marriage')
    ))
    .limit(1);
  
  if (!proposal) {
    return await ctx.reply("❌ У вас нет предложений брака!");
  }
  
  const [fromUser] = await db.select().from(users).where(eq(users.id, proposal.fromUserId));
  if (!fromUser) return;
  
  await db.insert(marriages).values({
    user1Id: proposal.fromUserId,
    user2Id: user.id,
    marriedAt: new Date(),
    chatId: proposal.chatId,
  });
  
  await db.delete(pendingProposals).where(eq(pendingProposals.id, proposal.id));
  
  await ctx.replyWithHTML(
    `💍 <b>Поздравляем!</b>\n` +
    `@${fromUser.username || fromUser.firstName} и @${user.username || user.firstName} теперь в браке! 💑`
  );
});

bot.command('divorce', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [marriageRecord] = await db.select().from(marriages)
    .where(or(
      eq(marriages.user1Id, user.id),
      eq(marriages.user2Id, user.id)
    ))
    .limit(1);
  
  if (!marriageRecord) {
    return await ctx.reply("❌ Вы не в браке!");
  }
  
  await db.delete(marriages).where(eq(marriages.id, marriageRecord.id));
  await ctx.reply("💔 Развод оформлен...");
});

bot.command('dating', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const mentioned = ctx.message.entities?.find(e => e.type === 'mention' || e.type === 'text_mention');
  if (!mentioned) {
    return await ctx.reply("❌ Укажите пользователя: /dating @username");
  }
  
  let targetUser;
  if (mentioned.type === 'text_mention' && mentioned.user) {
    const [found] = await db.select().from(users).where(eq(users.telegramId, mentioned.user.id));
    targetUser = found;
  } else {
    const username = ctx.message.text.slice(mentioned.offset + 1, mentioned.offset + mentioned.length);
    const [found] = await db.select().from(users).where(eq(users.username, username));
    targetUser = found;
  }
  
  if (!targetUser) {
    return await ctx.reply("❌ Пользователь не найден");
  }
  
  if (user.id === targetUser.id) {
    return await ctx.reply("❌ Не можете начать отношения сами с собой!");
  }
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(pendingProposals).values({
    fromUserId: user.id,
    toUserId: targetUser.id,
    type: 'dating',
    chatId: Number(ctx.chat?.id || 0),
    expiresAt,
  });
  
  await ctx.replyWithHTML(
    `💕 <b>@${user.username || user.firstName}</b> предлагает отношения <b>@${targetUser.username || targetUser.firstName}</b>`
  );
});

bot.command('breakup', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const [relationshipRecord] = await db.select().from(relationships)
    .where(or(
      eq(relationships.user1Id, user.id),
      eq(relationships.user2Id, user.id)
    ))
    .limit(1);
  
  if (!relationshipRecord) {
    return await ctx.reply("❌ Вы не в отношениях!");
  }
  
  await db.delete(relationships).where(eq(relationships.id, relationshipRecord.id));
  await ctx.reply("💔 Отношения закончены...");
});

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
  
  const transformUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
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
  
  // ПЕРВАЯ ПРОВЕРКА: Превращение - удаляем сообщение если юзер не пишет звук
  if (user.transformUntil && new Date() < new Date(user.transformUntil) && user.transformAnimal) {
    const sound = ANIMAL_SOUNDS[user.transformAnimal];
    if (sound && !text.startsWith(sound)) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Не удалось удалить
      }
      return;
    }
  }
  
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

  // Премиум превращение (текстовое)
  if (text === "превратить") {
    if (!user.isPremium && !isOwner(ctx.from.id)) {
      return await ctx.reply("❌ Эта команда только для премиум пользователей!");
    }

    const now = new Date();
    
    // Для владельца - бесконечное использование (без ограничений)
    // Для обычных пользователей - 1 раз в день
    if (!isOwner(ctx.from.id) && user.transformUntil && user.transformAnimal) {
      const lastTransformTime = new Date(user.transformUntil);
      const hoursPassed = (now.getTime() - lastTransformTime.getTime()) / (1000 * 60 * 60);
      if (hoursPassed < 24 - 1) {
        const hoursLeft = Math.ceil(24 - hoursPassed);
        return await ctx.reply(`⏳ Превращение доступно через ${hoursLeft} часов!`);
      }
    }

    const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const sound = ANIMAL_SOUNDS[randomAnimal];
    const emoji = ANIMAL_EMOJIS[randomAnimal];
    const transformUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 час

    await db.update(users)
      .set({
        transformAnimal: randomAnimal,
        transformUntil,
      })
      .where(eq(users.id, user.id));

    return await ctx.replyWithHTML(
      `${emoji} <b>Вы превратились в ${randomAnimal}!</b>\n\n` +
      `🔊 Ваш звук: <b>${sound}</b>\n` +
      `⏱️ Длится 1 час\n\n` +
      `Начинайте сообщения с "${sound}" или они будут удалены!`
    );
  }

  // RP текстовые команды - ВСЕ ВАРИАНТЫ
  const rpTextCommands: Record<string, { emoji: string; action: string }> = {
    // Основные RP
    обнять: { emoji: "🤗", action: "обнял(а)" },
    целовать: { emoji: "💋", action: "поцеловал(а)" },
    поцеловать: { emoji: "💋", action: "поцеловал(а)" },
    бить: { emoji: "👊", action: "ударил(а)" },
    ударить: { emoji: "👊", action: "ударил(а)" },
    гладить: { emoji: "🤚", action: "погладил(а)" },
    шлепать: { emoji: "👋", action: "шлёпнул(а)" },
    лизать: { emoji: "👅", action: "облизал(а)" },
    кусать: { emoji: "🦷", action: "укусил(а)" },
    // Взрослые команды
    выебать: { emoji: "🔞", action: "выебал(а)" },
    трахать: { emoji: "🔞", action: "трахал(а)" },
    сосать: { emoji: "🍆", action: "сосал(а)" },
    ебать: { emoji: "🔞", action: "ебал(а)" },
    выеба: { emoji: "🔞", action: "выебал(а)" },
    траха: { emoji: "🔞", action: "трахал(а)" },
    соса: { emoji: "🍆", action: "сосал(а)" },
    еба: { emoji: "🔞", action: "ебал(а)" },
    задрочить: { emoji: "💦", action: "задрочил(а)" },
    дрочить: { emoji: "💦", action: "дрочил(а)" },
    // Доминирование
    доминировать: { emoji: "👑", action: "доминирует над" },
    доминирует: { emoji: "👑", action: "доминирует над" },
    подчиняться: { emoji: "🙇", action: "подчиняется" },
    подчинять: { emoji: "🙇", action: "подчинил(а)" },
    // Связывание
    связать: { emoji: "🔗", action: "связал(а)" },
    приковать: { emoji: "⛓️", action: "приковал(а)" },
    заковать: { emoji: "⛓️", action: "заковал(а)" },
    // Дополнительные
    целка: { emoji: "💋", action: "целовал(а)" },
    поцелуй: { emoji: "💋", action: "поцеловал(а)" },
    смешать: { emoji: "😈", action: "смешивал(а)" },
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

  // Текстовые модерационные команды
  // бан @user
  const banMatch = text.match(/^бан\s+@([\w]+)$/i);
  if (banMatch) {
    if (!ctx.chat || ctx.chat.type === 'private') {
      return await ctx.reply("❌ Команда работает только в группах");
    }
    
    try {
      const admins = await ctx.getChatAdministrators();
      const isAdmin = admins.some(a => a.user.id === ctx.from?.id);
      
      if (!isAdmin && !isOwner(ctx.from.id)) {
        return await ctx.reply("❌ Только администраторы могут банить");
      }
      
      const username = banMatch[1];
      const [targetUser] = await db.select().from(users).where(eq(users.username, username));
      
      if (!targetUser) {
        return await ctx.reply("❌ Пользователь не найден");
      }
      
      try {
        await ctx.banChatMember(targetUser.telegramId);
        return await ctx.reply(`🚫 @${username} забанен`);
      } catch (e) {
        return await ctx.reply("❌ Ошибка при бане");
      }
    } catch (e) {
      return await ctx.reply("❌ Ошибка");
    }
  }

  // кик @user
  const kickMatch = text.match(/^кик\s+@([\w]+)$/i);
  if (kickMatch) {
    if (!ctx.chat || ctx.chat.type === 'private') {
      return await ctx.reply("❌ Команда работает только в группах");
    }
    
    try {
      const admins = await ctx.getChatAdministrators();
      const isAdmin = admins.some(a => a.user.id === ctx.from?.id);
      
      if (!isAdmin && !isOwner(ctx.from.id)) {
        return await ctx.reply("❌ Только администраторы могут кикать");
      }
      
      const username = kickMatch[1];
      const [targetUser] = await db.select().from(users).where(eq(users.username, username));
      
      if (!targetUser) {
        return await ctx.reply("❌ Пользователь не найден");
      }
      
      try {
        await ctx.banChatMember(targetUser.telegramId);
        await ctx.unbanChatMember(targetUser.telegramId);
        return await ctx.reply(`👢 @${username} выгнан`);
      } catch (e) {
        return await ctx.reply("❌ Ошибка при кике");
      }
    } catch (e) {
      return await ctx.reply("❌ Ошибка");
    }
  }

  // предупреждение @user или мут @user
  const warnMatch = text.match(/^(предупреждение|мут)\s+@([\w]+)$/i);
  if (warnMatch) {
    if (!ctx.chat || ctx.chat.type === 'private') {
      return await ctx.reply("❌ Команда работает только в группах");
    }
    
    try {
      const admins = await ctx.getChatAdministrators();
      const isAdmin = admins.some(a => a.user.id === ctx.from?.id);
      
      if (!isAdmin && !isOwner(ctx.from.id)) {
        return await ctx.reply("❌ Только администраторы могут давать предупреждения");
      }
      
      const username = warnMatch[2];
      const [targetUser] = await db.select().from(users).where(eq(users.username, username));
      
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
      
      return await ctx.replyWithHTML(
        `⚠️ <b>@${username}</b> получил предупреждение!\n` +
        `Всего: ${warningCount[0].count}`
      );
    } catch (e) {
      return await ctx.reply("❌ Ошибка");
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
