import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { users, marriages, duels, relationships, pendingProposals, chats, warnings, businesses, mutes, bans, inventory, premiumPurchases, currencyPurchases } from '@shared/schema';
import { eq, and, or, desc, sql, lt } from 'drizzle-orm';

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
    [user] = await db.insert(users).values({
      telegramId, username: ctx.from.username || null, firstName: ctx.from.first_name || null,
      lastName: ctx.from.last_name || null, balance: 1000,
    }).returning();
    console.log(`[USER] Создан новый пользователь ID: ${telegramId}`);
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
  const senderName = user.username ? `@${user.username}` : user.firstName || "Юзер";
  const targetName = targetUser.username ? `@${targetUser.username}` : targetUser.first_name || "Юзер";
  const pastTenseVerb = rpVerbsPastTense[actionKey] || actionKey;
  
  // Получить описание действия (если есть) или использовать случайное
  const descriptions = rpActionDescriptions[actionKey];
  const description = descriptions ? descriptions[Math.floor(Math.random() * descriptions.length)] : "RP сцена";
  
  // Красивый формат: эмодзи | Описание сцены | Контекст
  const message = `${sticker} | ${senderName} ${pastTenseVerb} ${targetName} | ${description}`;
  
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

// ТРАНСФОРМАЦИЯ СЕБЯ
bot.command('transform', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[TRANSFORM] Пользователь ${user.username} (${user.telegramId}) вызвал команду трансформация`);
  const { canTransform, message: msg } = await checkTransformCooldown(user);
  if (!canTransform) {
    console.log(`[TRANSFORM] КД: ${msg}`);
    return await ctx.replyWithHTML(msg!);
  }
  
  const args = ctx.message.text.split(' ');
  const animal = args[1]?.toLowerCase();
  
  if (!animal || !ANIMALS.includes(animal)) {
    return await ctx.reply(`❌ Животное не найдено. Доступны: ${ANIMALS.join(', ')}`);
  }
  
  if (!isOwner(user.telegramId) && user.balance < 500) return await ctx.reply('❌ Нужно 500⭐');
  
  const transformUntil = new Date(Date.now() + TRANSFORM_DURATION_HOURS * 60 * 60 * 1000);
  await db.update(users).set({
    balance: isOwner(user.telegramId) ? user.balance : user.balance - 500,
    transformAnimal: animal,
    transformUntil,
    lastTransformAt: new Date(),
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `${ANIMAL_EMOJIS[animal]} <b>Превращение!</b>\n\n` +
    `Животное: <b>${animal}</b>\n` +
    `Длительность: ${TRANSFORM_DURATION_HOURS} час\n` +
    `${isOwner(user.telegramId) ? 'Стоимость: БЕСПЛАТНО (ВЛАДЕЛЕЦ)' : 'Стоимость: -500⭐'}\n` +
    `⏳ <b>КД:</b> 24ч`
  );
});

// ТРАНСФОРМАЦИЯ ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ (на основе ответа)
async function handleTransformOther(ctx: Context) {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  console.log(`[TRANSFORM_OTHER] Пользователь ${user.username} (${user.telegramId}) вызвал команду превратить`);
  const replyTo = (ctx.message as any)?.reply_to_message;
  if (!replyTo || !replyTo.from) {
    return await ctx.reply('❌ Ответьте на сообщение пользователя и укажите животное');
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
  
  const msg = ctx.message as any;
  const text = msg?.text || '';
  const args = text.split(' ');
  const animal = args[1]?.toLowerCase();
  
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

// ПОКУПКА ПРЕФИКСА НАД НИКОМ
bot.command('prefix', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const args = ctx.message.text.split(' ');
  const prefix = args.slice(1).join(' ');
  
  if (!prefix) {
    return await ctx.replyWithHTML(
      `<b>Использование:</b> /prefix ✨\n\n` +
      `Префикс появится над вашим ником в RP командах\n` +
      `<b>Стоимость:</b> 100⭐\n` +
      `\n<b>Примеры:</b>\n` +
      `✨ КОРОЛЕВА ✨\n` +
      `👑 КОРОЛЬ 👑\n` +
      `💎 ЛЕГЕНДА 💎`
    );
  }
  
  if (prefix.length > 20) {
    return await ctx.reply('❌ Префикс слишком длинный (максимум 20 символов)');
  }
  
  if (user.balance < 100) return await ctx.reply('❌ Нужно 100⭐');
  
  await db.update(users).set({
    balance: user.balance - 100,
    nickPrefix: prefix,
  }).where(eq(users.id, user.id));
  
  await ctx.replyWithHTML(
    `✅ <b>Префикс установлен!</b>\n\n` +
    `<b>${prefix}</b> будет показываться над вашим ником\n` +
    `Стоимость: -100⭐`
  );
});

// ═══════════════════════════════════════════════════════════
// ОБРАБОТЧИК ТЕКСТОВЫХ RP КОМАНД (без "/" префикса)
// ═══════════════════════════════════════════════════════════

bot.on('text', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) return;
  
  const text = ctx.message.text.toLowerCase().trim();
  const replyTo = ctx.message.reply_to_message;
  
  // Проверка звуков животных для трансформированных пользователей
  if (user.transformAnimal && user.transformUntil && new Date() < new Date(user.transformUntil)) {
    const expectedSound = ANIMAL_SOUNDS[user.transformAnimal];
    if (expectedSound && !text.includes(expectedSound)) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Игнорируем ошибки удаления
      }
      return;
    }
  }
  
  // Обработка RP команд (только если ответ на сообщение)
  if (!replyTo || !replyTo.from) return;
  
  for (const [command, emoji] of Object.entries(rpActions)) {
    if (text === command) {
      await handleRpAction(ctx, command, emoji);
      return;
    }
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
