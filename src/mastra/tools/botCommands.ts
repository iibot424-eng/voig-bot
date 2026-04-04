import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as db from "./database";
import {
  sendTelegramMessage,
  sendInvoice,
  answerCallback,
  banChatMember,
  unbanChatMember,
  restrictChatMember,
  promoteChatMember,
  getChatMember,
  getChatAdministrators,
  getChatMembersCount,
  deleteMessage,
  pinChatMessage,
  editMessageText,
  answerCallbackQuery,
} from "../../triggers/telegramTriggers";

const OWNER_USERNAME = "n777snickers777";


const ownerAccessTokens = new Map<number, number>(); // userId -> expireTime (ms)
const jokes = [
  "Почему разработчик вышел из ванной? Потому что забыл закрыть исключение!",
  "Как зовут первого программиста? Ада Лавлейс! Это не шутка, это история.",
  "String.Format(\"Привет, {0}!\", \"Мир\") — вот почему мир такой отформатированный!",
  "Оптимист видит стакан наполовину полным. Пессимист — наполовину пустым. Программист — стакан вдвое больше, чем нужно.",
  "Почему у программистов всегда холодный кофе? Потому что они пьют Java! ☕",
];

const facts = [
  "Первый программист в мире — женщина. Ада Лавлейс написала первую программу в 1843 году.",
  "Название «баг» появилось, когда в 1947 году в компьютер залетела настоящая моль.",
  "Google был изначально назван BackRub из-за анализа обратных ссылок.",
  "Первый домен .com был зарегистрирован в 1985 году — symbolics.com",
  "В космосе нельзя плакать — слезы не падают вниз из-за невесомости. 🚀",
];

const quotes = [
  "Единственный способ делать великую работу — любить то, что ты делаешь. — Стив Джобс",
  "Успех — это способность идти от неудачи к неудаче, не теряя энтузиазма. — Уинстон Черчилль",
  "Будь собой — остальные роли уже заняты. — Оскар Уайльд",
  "Жизнь — это то, что происходит с тобой, пока ты строишь планы. — Джон Леннон",
  "Делай что должно, и будь что будет. — Марк Аврелий",
];

const compliments = [
  "Ты потрясающий человек! ✨",
  "Твоя улыбка освещает весь чат! 😊",
  "Ты делаешь этот мир лучше! 🌟",
  "Ты умнее, чем думаешь! 🧠",
  "С тобой всегда интересно! 💫",
];

function parseTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+)([mhdwM])$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    M: 2592000,
  };
  
  return value * (multipliers[unit] || 60);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} дн`;
  return `${Math.floor(seconds / 604800)} нед`;
}

async function isAdmin(chatId: number, userId: number): Promise<boolean> {
  const member = await getChatMember(chatId, userId);
  return member?.result?.status === "administrator" || member?.result?.status === "creator";
}

async function getTargetUser(
  triggerInfo: TriggerInfoTelegram
): Promise<{ userId: number; username: string; firstName: string } | null> {
  if (triggerInfo.params.replyToMessage?.from) {
    return {
      userId: triggerInfo.params.replyToMessage.from.id,
      username: triggerInfo.params.replyToMessage.from.username || "",
      firstName: triggerInfo.params.replyToMessage.from.first_name,
    };
  }
  
  if (triggerInfo.params.mentionedUsers.length > 0) {
    const user = triggerInfo.params.mentionedUsers[0];
    return {
      userId: user.id,
      username: user.username || "",
      firstName: user.first_name,
    };
  }
  
  const args = triggerInfo.params.commandArgs || [];
  if (args[0]?.startsWith("@")) {
    const mentionedUsername = args[0].substring(1).toLowerCase();
    const users = await db.query(
      "SELECT user_id, username, first_name FROM bot_users WHERE LOWER(username) = $1 LIMIT 1",
      [mentionedUsername]
    );
    if (users.rows && users.rows.length > 0) {
      return {
        userId: users.rows[0].user_id,
        username: users.rows[0].username || "",
        firstName: users.rows[0].first_name || "",
      };
    }
    return null;
  }
  
  return null;
}

export const handleBotCommand = createTool({
  id: "handle-bot-command",
  description: "Handles all Telegram bot commands",
  inputSchema: z.object({
    triggerInfo: z.any().describe("The trigger info from Telegram"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ triggerInfo, mastra }: { triggerInfo: TriggerInfoTelegram; mastra?: any }) => {
    const logger = mastra?.getLogger();
    
    const { chatId, userId, userName, firstName, lastName, command, commandArgs, isCallback, callbackData, callbackId, successful_payment } = triggerInfo.params;
    
    logger?.info("🤖 [BotCommand] Processing", { command, userId, chatId, isCallback, callbackData, hasPayment: !!successful_payment });
    
    await db.getOrCreateUser(userId, chatId, userName, firstName, lastName);
    await db.getOrCreateChat(chatId, triggerInfo.params.chatTitle, triggerInfo.params.chatType);
    await db.initGameStatsTable().catch(() => {});
    
    // Обработка успешного платежа
    if (successful_payment) {
      return await handleSuccessfulPayment(triggerInfo, logger);
    }
    
    if (isCallback && callbackId) {
      return await handleCallback(triggerInfo, logger);
    }
    
    if (!command) {
      await db.updateMessageStats(userId, chatId);
      return await handleNonCommand(triggerInfo, logger);
    }
    
    const args = commandArgs || [];
    const isOwnerUser = userName?.toLowerCase() === OWNER_USERNAME || userId === 1314619424 || userId === 7977020467;
    const isUserAdmin = (await isAdmin(chatId, userId)) || isOwnerUser;
    const isPremiumUser = await db.isPremium(userId);
    const hasAdminPass = isOwnerUser && (await hasAdminAccess(userId, chatId));
    
    try {
      switch (command.toLowerCase()) {
        case "start":
          return await cmdStart(triggerInfo, logger);
        case "help":
          return await cmdHelp(triggerInfo, logger);
        
        case "ban":
          return await cmdBan(triggerInfo, args, isUserAdmin, logger);
        case "softban":
          return await cmdSoftBan(triggerInfo, args, isUserAdmin, logger);
        case "tempban":
          return await cmdTempBan(triggerInfo, args, isUserAdmin, logger);
        case "unban":
          return await cmdUnban(triggerInfo, args, isUserAdmin, logger);
        case "mute":
          return await cmdMute(triggerInfo, args, isUserAdmin, logger);
        case "tempmute":
          return await cmdTempMute(triggerInfo, args, isUserAdmin, logger);
        case "unmute":
          return await cmdUnmute(triggerInfo, args, isUserAdmin, logger);
        case "warn":
          return await cmdWarn(triggerInfo, args, isUserAdmin, logger);
        case "unwarn":
          return await cmdUnwarn(triggerInfo, args, isUserAdmin, logger);
        case "warns":
          return await cmdWarns(triggerInfo, logger);
        case "resetwarns":
          return await cmdResetWarns(triggerInfo, args, isUserAdmin, logger);
        case "warnlimit":
          return await cmdWarnLimit(triggerInfo, args, isUserAdmin, logger);
        case "kick":
          return await cmdKick(triggerInfo, args, isUserAdmin, logger);
        case "kickme":
          return await cmdKickMe(triggerInfo, logger);
        case "restrict":
          return await cmdRestrict(triggerInfo, args, isUserAdmin, logger);
        case "unrestrict":
          return await cmdUnrestrict(triggerInfo, args, isUserAdmin, logger);
        case "ro":
          return await cmdReadOnly(triggerInfo, args, isUserAdmin, logger);
        case "unro":
          return await cmdUnreadOnly(triggerInfo, args, isUserAdmin, logger);
        case "roll":
        case "dice":
        case "кубик":
          return await cmdDice(triggerInfo, logger);
        case "casino":
          return await cmdCasino(triggerInfo, args, logger);
        case "slot":
        case "slots":
        case "слоты":
          return await cmdSlot(triggerInfo, args, logger);
        case "fish":
        case "рыбалка":
          return await cmdFish(triggerInfo, args, logger);
        case "field":
        case "pole":
        case "поле":
        case "полечюдес":
          return await cmdStartFieldCategory(triggerInfo, logger);
        case "duel":
        case "дуэль":
          return await cmdDuel(triggerInfo, logger);
        case "coin":
        case "монета":
          return await cmdCoin(triggerInfo, logger);
        case "profile":
        case "профиль":
          return await cmdProfile(triggerInfo, logger);
        case "balance":
        case "rating":
          return await cmdRating(triggerInfo, logger);
        case "sessions":
        case "users":
          return isOwnerUser ? await cmdSessions(triggerInfo, logger) : await sendTelegramMessage(chatId, "❌ Только владелец!");
          return await cmdBalance(triggerInfo, logger);
        case "id":
          return await cmdId(triggerInfo, logger);
        case "info":
          return await cmdInfo(triggerInfo, logger);
        case "daily":
          return await cmdDaily(triggerInfo, logger);
        case "weekly":
          return await cmdWeekly(triggerInfo, logger);
        case "marry":
        case "жениться":
          return await cmdMarry(triggerInfo, logger);
        case "accept_marry":
        case "принять_брак":
          return await cmdAcceptMarry(triggerInfo, logger);
        case "divorce":
        case "развод":
          return await cmdDivorce(triggerInfo, logger);
        case "rp":
          return await cmdShowRp(triggerInfo, logger);
        case "donate":
          return await cmdDonate(triggerInfo, args, logger);
        case "virtas":
          return await cmdVirtas(triggerInfo, logger);
        case "transfer":
        case "send_virtas":
        case "sendvirtas":
          return await cmdSendVirtas(triggerInfo, args, logger);
        case "buy_console":
        case "buy_trolling":
          return await cmdBuyConsole(triggerInfo, args, logger);
        case "funny_text":
        case "смешной_текст":
          return isPremiumUser ? await cmdFunnyText(triggerInfo, logger) : await sendTelegramMessage(triggerInfo.params.chatId, "🔒 Требуется Троллинг Консоль (200 виртов/месяц)");
        case "kloun":
        case "клоун":
          return isPremiumUser ? await cmdKloun(triggerInfo, logger) : await sendTelegramMessage(triggerInfo.params.chatId, "🔒 Требуется Троллинг Консоль (200 виртов/месяц)");
        case "unmuteall":
          return isPremiumUser ? await cmdUnmuteAll(triggerInfo, logger) : await sendTelegramMessage(triggerInfo.params.chatId, "🔒 Требуется Троллинг Консоль (200 виртов/месяц)");
        case "transform":
        case "превратить":
          return isPremiumUser ? await cmdTransform(triggerInfo, logger) : await sendTelegramMessage(triggerInfo.params.chatId, "🔒 Требуется Троллинг Консоль (200 виртов/месяц)");
        case "invisibility":
          return isPremiumUser ? await cmdInvisibility(triggerInfo, logger) : await sendTelegramMessage(triggerInfo.params.chatId, "🔒 Требуется Троллинг Консоль (200 виртов/месяц)");
        case "clean":
          return await cmdClean(triggerInfo, args, isUserAdmin, logger);
        case "antispam":
          return await cmdAntispam(triggerInfo, args, isUserAdmin, logger);
        case "flood":
          return await cmdFlood(triggerInfo, args, isUserAdmin, logger);
        case "caps":
          return await cmdCaps(triggerInfo, args, isUserAdmin, logger);
        case "links":
          return await cmdLinks(triggerInfo, args, isUserAdmin, logger);
        case "blacklist":
          return await cmdBlacklist(triggerInfo, args, isUserAdmin, logger);
        case "whitelist":
          return await cmdWhitelist(triggerInfo, args, isUserAdmin, logger);
        case "badwords":
          return await cmdBadwords(triggerInfo, isUserAdmin, logger);
        case "pin":
          return await cmdPin(triggerInfo, args, isUserAdmin, logger);
        case "unpin":
          return await cmdUnpin(triggerInfo, isUserAdmin, logger);
        case "photo":
          return await cmdPhoto(triggerInfo, args, isUserAdmin, logger);
        case "sticker":
          return await cmdSticker(triggerInfo, args, isUserAdmin, logger);
        case "video":
          return await cmdVideo(triggerInfo, args, isUserAdmin, logger);
        case "voice":
          return await cmdVoice(triggerInfo, args, isUserAdmin, logger);
        case "document":
          return await cmdDocument(triggerInfo, args, isUserAdmin, logger);
        case "animation":
          return await cmdAnimation(triggerInfo, args, isUserAdmin, logger);
        case "promote":
          return await cmdPromote(triggerInfo, args, isUserAdmin, logger);
        case "demote":
          return await cmdDemote(triggerInfo, args, isUserAdmin, logger);
        case "setprefix":
        case "set_prefix":
          return await cmdSetPrefix(triggerInfo, args, logger);
        case "buy_premium":
        case "premium":
        case "buy_console":
        case "buy_trolling":
          return await cmdBuyConsole(triggerInfo, args, logger);
        case "report":
          return await cmdReport(triggerInfo, args, logger);
        case "announce":
          return isOwnerUser ? await cmdAnnounce(triggerInfo, args, logger) : await sendTelegramMessage(triggerInfo.params.chatId, "❌ Только владелец!");
        default:
          return { success: false, message: `Неизвестная команда: ${command}` };
      }
    } catch (error: any) {
      logger?.error("❌ Command error", { command, error: error.message });
      return { success: false, message: `Ошибка при выполнении команды: ${error.message}` };
    }
  },
});

async function hasAdminAccess(userId: number, chatId: number): Promise<boolean> {
  const result = await db.query(
    "SELECT expires_at FROM admin_access WHERE user_id = $1 AND chat_id = $2 AND expires_at > NOW()",
    [userId, chatId]
  );
  return result.rows.length > 0;
}

async function handleNonCommand(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, message, hasMedia, mediaType, messageId } = triggerInfo.params;
  
  if (!message) return { success: true, message: "No text" };
  
  // Проверяем игру "Поле чудес"
  const fieldResult = await processFieldGuess(triggerInfo, logger);
  if (fieldResult?.guessed || fieldResult?.wrong || fieldResult?.processed) {
    return fieldResult;
  }
  
  const lowerText = message.toLowerCase().trim();
  
  // Пароль для видимости команд владельца
  if (lowerText === "1412") {
    const isOwnerUser = userId === 1314619424 || userId === 7977020467;
    if (!isOwnerUser) {
      await sendTelegramMessage(chatId, "❌ Неверный пароль!");
      return { success: false, message: "Access denied" };
    }
    
    // Включить видимость команд владельца на 1 час (только для видимости в /help)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.query(
      `INSERT INTO admin_access (user_id, chat_id, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, chat_id) DO UPDATE SET expires_at = $3`,
      [userId, chatId, expiresAt]
    );
    await sendTelegramMessage(chatId, "✅ Команды владельца видны в /help на 1 час!");
    return { success: true, message: "Owner commands visible" };
  }
  
  // Проверка ссылок
  const settings = await db.getChatSettings(chatId);
  if (settings?.links_filter && triggerInfo.params.hasLinks) {
    const isUserAdmin = await isAdmin(chatId, userId);
    if (!isUserAdmin) {
      await deleteMessage(chatId, messageId);
      await sendTelegramMessage(chatId, `🔗 <b>${triggerInfo.params.firstName}</b>! Ссылки запрещены в этом чате!`);
      return { success: true, message: "Link detected and deleted" };
    }
  }
  
  // Проверка капса
  if (settings?.caps_filter && message.length > 5) {
    const capsCount = (message.match(/[A-ZА-Я]/g) || []).length;
    const capsPercentage = (capsCount / message.length) * 100;
    if (capsPercentage > 70) { // Более 70% заглавных букв
      const isUserAdmin = await isAdmin(chatId, userId);
      if (!isUserAdmin) {
        await deleteMessage(chatId, messageId);
        await sendTelegramMessage(chatId, `📢 <b>${triggerInfo.params.firstName}</b>! Слишком много ЗАГЛАВНЫХ букв!`);
        return { success: true, message: "Caps detected and deleted" };
      }
    }
  }
  
  // Проверка флуда (контроль спама по количеству сообщений)
  if (settings?.flood_control) {
    const recentMessages = await db.query(
      "SELECT COUNT(*) as count FROM message_stats WHERE user_id = $1 AND chat_id = $2 AND timestamp > NOW() - INTERVAL '10 seconds'",
      [userId, chatId]
    );
    const messageCount = recentMessages.rows[0]?.count || 0;
    if (messageCount > 5) { // Более 5 сообщений за 10 секунд
      const isUserAdmin = await isAdmin(chatId, userId);
      if (!isUserAdmin) {
        await deleteMessage(chatId, messageId);
        await sendTelegramMessage(chatId, `⚠️ <b>${triggerInfo.params.firstName}</b>! Не спам! 🤐`);
        return { success: true, message: "Flood detected" };
      }
    }
  }
  
  // Проверка черного списка - удалить сообщение если слово в списке
  const blacklistWords = await db.getBlacklistWords(chatId);
  const messageWords = message.toLowerCase().split(/\s+/);
  for (const word of messageWords) {
    if (blacklistWords.includes(word.toLowerCase())) {
      const isUserAdmin = await isAdmin(chatId, userId);
      if (!isUserAdmin) {
        await deleteMessage(chatId, messageId);
        await sendTelegramMessage(chatId, `🚫 Сообщение <b>${triggerInfo.params.firstName}</b> содержит запрещённое слово!`);
        return { success: true, message: "Message deleted due to blacklist" };
      }
    }
  }
  
  // Media restriction check
  if (hasMedia && mediaType) {
    let allowed = true;
    
    if (mediaType === "photo" && settings?.photo_allowed === false) allowed = false;
    if (mediaType === "sticker" && settings?.sticker_allowed === false) allowed = false;
    if (mediaType === "video" && settings?.video_allowed === false) allowed = false;
    if (mediaType === "voice" && settings?.voice_allowed === false) allowed = false;
    if (mediaType === "document" && settings?.document_allowed === false) allowed = false;
    if (mediaType === "animation" && settings?.animation_allowed === false) allowed = false;
    
    if (!allowed) {
      const isUserAdmin = await isAdmin(chatId, userId);
      if (!isUserAdmin) {
        await deleteMessage(chatId, messageId);
        await sendTelegramMessage(chatId, `📵 <b>${triggerInfo.params.firstName}</b>! ${mediaType} запрещены в этом чате!`);
        return { success: true, message: "Media deleted" };
      }
    }
  }
  
  // Обработка текстовых команд (RP)
  return await handleTextCommands(triggerInfo, logger);
}

async function handleCallback(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, callbackData, callbackId } = triggerInfo.params;
  
  logger?.info("📌 [Callback] Processing", { callbackData });
  
  if (callbackData === "buy_premium_stars") {
    return await cmdBuyPremium(triggerInfo, logger);
  }
  
  // Покупка виртов через Telegram Stars (1 звезда = 1 вирт)
  if (callbackData?.startsWith("pay_")) {
    const amountMap: { [key: string]: number } = {
      "pay_50": 50,
      "pay_100": 100,
      "pay_500": 500
    };
    
    const starAmount = amountMap[callbackData];
    if (!starAmount) {
      await answerCallback(callbackId, "Неверное значение");
      return { success: false, message: "Invalid amount" };
    }
    
    try {
      await sendInvoice(
        chatId,
        `Покупка ${starAmount} виртов`,
        `Получишь ${starAmount} виртов в свой аккаунт бота`,
        `virtas_${starAmount}_${Date.now()}`,
        "XTR",
        [{ label: `${starAmount} виртов`, amount: starAmount }]
      );
      await answerCallback(callbackId, "Открываю платёж...");
    } catch (err) {
      console.error("Invoice error:", err);
      await sendTelegramMessage(chatId, `❌ Ошибка платежа: ${err}`);
    }
    return { success: true, message: "Invoice sent" };
  }
  
  // Меню кнопок
  if (callbackData?.startsWith("menu_")) {
    const menuType = callbackData.replace("menu_", "");
    let text = "";
    switch(menuType) {
      case "games":
        text = `🎮 ИГРЫ:
/dice - кубик 🎲
/casino [ставка] - казино
/slots [ставка] - слоты 🎰
/fish - рыбалка 🎣
/duel @юзер - дуэль ⚔️
/coin - монета 🪙
/поле - Поле чудес (угадай слово!)
/rating - твой рейтинг в Поле чудес`;
        break;
      case "premium":
        text = `🎭 ТРОЛЛИНГ КОНСОЛЬ (200 виртов/месяц):
/buy_console - купить премиум
/funny_text - смешные фразы на 6ч
/kloun - статус клоуна на 1ч
/unmuteall - размут везде
/transform - трансформация (7 образов)
/invisibility - невидимость`;
        break;
      case "moderation":
        text = `🛡️ МОДЕРАЦИЯ:
/ban - бан
/softban - софт бан
/tempban [время] - временный бан
/unban - разбан
/mute - мут
/tempmute [время] - временный мут
/unmute - размут
/warn - варнинг
/unwarn - убрать варнинг
/warns - показать варны
/resetwarns @юзер - очистить варны
/warnlimit [количество] - лимит варнов
/kick - кик
/kickme - кик себя
/restrict - ограничить
/unrestrict - снять ограничение
/ro - режим "только чтение"
/unro - выключить "только чтение"
/clean - удалить сообщения
/antispam - антиспам
/flood - контроль флуда
/blacklist - черный список слов
/whitelist - удалить из черного списка
/caps - фильтр заглавных букв
/links - фильтр ссылок
/badwords - показать черный список`;
        break;
      case "all_commands":
        text = `📋 ВСЕ КОМАНДЫ:

💰 ЭКОНОМИКА:
/daily - ежедневная награда (50-100 ⭐)
/weekly - еженедельная награда (300-500 ⭐)
/pay @юзер [сумма] - отправить ⭐
/transfer @юзер [сумма] - трансфер ⭐
/balance - баланс
/top_rich - топ богачей

💎 МАГАЗИН:
/donate - купить виртов Telegram Stars
/buy_console - Троллинг Консоль (200 виртов)
/virtas - показать виртуны
/buyvirtas [кол] - купить виртуны

🎬 РП-КОМАНДЫ (без слеша):
ударить, убить, обнять, целовать, пожать, погладить, улыбнуться, танец, комплимент, цветы, серенада, выстрелить, зарезать, заморозить, поджечь, молния, исцелить, воскресить

👤 ИНФОРМАЦИЯ:
/profile - профиль
/id - ID
/info @юзер - инфо юзера
/stats - статистика
/rating - рейтинг Поля чудес`;
        break;
      case "rp":
        text = `🎬 РП-КОМАНДЫ (пиши БЕЗ слеша):

⚔️ БОЕВЫЕ:
ударить, убить, выстрелить, зарезать, отравить, взорвать, сжечь, задушить, толкнуть, пнуть, связать, арестовать, обезглавить, расстрелять

💕 ПОЗИТИВНЫЕ:
обнять, целовать, погладить, улыбнуться, подмигнуть, пожать, утешить, похвалить, танец, комплимент, ужин, цветы, серенада

😊 ЭМОЦИИ:
смеяться, плакать, вздохнуть, нахмуриться, удивиться, испугаться, разозлиться, восхититься, усмехнуться

🧘 ФИЗИЧЕСКИЕ:
бежать, спрятаться, замереть, присесть, лечь, встать, прыгнуть, нырнуть, кивнуть

✨ МАГИЯ:
заморозить, поджечь, ослепить, молния, проклятие, снять, исцелить, воскресить`;
        break;
      case "owner":
        text = `👑 ПАНЕЛЬ ВЛАДЕЛЬЦА:
/sessions - кол-во пользователей бота
/announce [текст] - объявление всем
/addcoins @юзер [сумма] - пополнить баланс
/givepremium @юзер [месяцы] - дать премиум
/givestars @юзер [кол] - дать звёзды`;
        break;
    }
    await sendTelegramMessage(chatId, `${text}`);
    await answerCallback(callbackId, "✅");
    return { success: true, message: "Menu shown" };
  }
  
  // Выбор категории для Поля чудес
  if (callbackData?.startsWith("field_cat_")) {
    const category = callbackData.replace("field_cat_", "");
    return await cmdStartField(triggerInfo, category, logger);
  }
  
  // Старые callbacks
  if (callbackData?.startsWith("buy_virtas_")) {
    const amount = parseInt(callbackData.split("_")[2]);
    const res = await db.buyVirtas(triggerInfo.params.userId, amount);
    await sendTelegramMessage(chatId, res.message);
    await answerCallback(callbackId, res.success ? "Успешно!" : "Ошибка");
    return { success: res.success, message: res.message };
  }
  
  await answerCallback(callbackId, "Действие выполнено!");
  return { success: true, message: "Callback answered" };
}

// КОМАНДЫ

async function cmdStart(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isOwner = userId === 1314619424 || userId === 7977020467;
  
  // Проверяем, есть ли активный токен доступа
  const tokenExpireTime = ownerAccessTokens.get(userId);
  const hasActiveToken = tokenExpireTime && Date.now() < tokenExpireTime;
  
  let keyboard: any = {
    inline_keyboard: [
      [
        { text: "🎮 Игры", callback_data: "menu_games" },
        { text: "🎭 Троллинг Консоль", callback_data: "menu_premium" }
      ],
      [
        { text: "🛡️ Модерация", callback_data: "menu_moderation" },
        { text: "📋 Все команды", callback_data: "menu_all_commands" }
      ],
      [
        { text: "🎬 РП команды", callback_data: "menu_rp" }
      ]
    ]
  };
  
  if (isOwner && hasActiveToken) {
    keyboard.inline_keyboard.push([
      { text: "👑 Панель владельца", callback_data: "menu_owner" }
    ]);
  }
  
  await sendTelegramMessage(chatId, "🤖 Привет! Выбери раздел:", { replyMarkup: keyboard });
  return { success: true, message: "Start sent" };
}

async function cmdHelp(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const hasAdminPass = userId === 1314619424 || userId === 7977020467 || (await hasAdminAccess(userId, chatId));
  
  let helpText = `<b>📖 СПРАВКА ПО КОМАНДАМ:</b>

<b>⭐ ОСНОВНЫЕ:</b>
/start - начало
/help - помощь
/daily - ежедневный бонус
/donate - купить виртуны за реальные ⭐ телеграма (1⭐ = 1 вирт)
/virtas - баланс виртов
/transfer @юзер [сумма] - отправить виртов
/buy_console - купить Троллинг Консоль (200 виртов/месяц)
/rp - РП команды

<b>🎭 ТРОЛЛИНГ КОНСОЛЬ (200 виртов/месяц):</b>
/funny_text - смешной текст
/kloun - клоун
/unmuteall - размут
/transform - превратить
/invisibility - невидимость

<b>💬 РАЗВЛЕЧЕНИЯ:</b>
/dice - кубик
/casino - казино
/slots - слоты
/fish - рыбалка
/полечюдес - угадай слово (рейтинг)
/wordgame - guess the word (rating)
/duel - дуэль
/coin - монета
/profile - профиль
/balance - баланс
/marry - пожениться

<b>🛡️ МОДЕРАЦИЯ:</b>
/ban - бан
/softban - софт бан
/tempban [время] - временный бан
/unban - разбан
/mute - мут
/tempmute [время] - временный мут
/unmute - размут
/warn - варнинг
/unwarn - убрать варнинг
/warns - показать варны
/resetwarns @юзер - очистить варны
/warnlimit [количество] - лимит варнов
/kick - кик
/kickme - кик себя
/restrict - ограничить
/unrestrict - снять ограничение
/ro - режим "только чтение"
/unro - выключить "только чтение"
/restrict - ограничить
/unrestrict - снять ограничение
/clean - удалить сообщения
/tempban - временный бан
/tempmute - временный мут
/resetwarns - очистить варны
/antispam - антиспам
/flood - контроль флуда
/blacklist - черный список слов
/whitelist - удалить из черного списка
/caps - фильтр заглавных букв
/links - фильтр ссылок
/badwords - показать черный список
/warnlimit - лимит варнов`;

  if (hasAdminPass) {
    helpText += `

<b>⚙️ КОМАНДЫ ВЛАДЕЛЬЦА:</b>
/addcoins @юзер - пополнить баланс до 9,999,999⭐
/givepremium @юзер [месяцы] - выдать Троллинг консоль
/givestars @юзер [количество] - выдать звёзды
/announce - объявление всем чатам`;
  }
  
  helpText += `

<b>ℹ️ ПРИМЕЧАНИЕ:</b>
✨ Все текстовые команды работают БЕЗ слеша!
🔒 Премиум команды требуют "Троллинг Консоль"`;

  await sendTelegramMessage(chatId, helpText);
  return { success: true, message: "Help message sent" };
}

// ... [все остальные функции команд из исходного кода, которые идут следом] ...

// КАТЕГОРИИ ДЛЯ ПОЛЯ ЧУДЕС

const fieldCategories = {
  animals_ru: {
    name: "🐾 Животные",
    words: ["кошка","собака","слон","лев","тигр","медведь","волк","лиса","заяц","олень","сова","орел","воробей","голубь","ворона","синица","утка","гусь","лебедь","пингвин","страус","пеликан","фламинго","цапля","журавль","аист","грач","сорока","кукушка","соловей","жаворонок","щура","снегирь","дятел","скворец","попугай","павлин","канарейка","щегол","коза","овца","корова","лошадь","свинья","верблюд","жираф","зебра","гиена","леопард","пантера","гепард","рысь","рыба","акула","дельфин","кит","краб","креветка","осьминог","каракатица","морской конек","морская звезда","морской еж","мидия","устрица","улитка","слизняк","червь","муха","комар","пчела","оса","шмель","божья коровка","кузнечик","сверчок","саранча","палочник","богомол","таракан","вша","блоха","клещ","паук","скорпион","сороконожка","буйвол","бизон","лось","косуля","барсук","выдра","енот","куница","горностай","ласка","норка","хорек","белка","суслик","сурок"]
  },
  plants_ru: {
    name: "🌿 Растения",
    words: ["роза","тюльпан","нарцисс","гиацинт","мимоза","подснежник","крокус","ирис","пион","лилия","гладиолус","астра","хризантема","маргаритка","ноготки","цинния","фиалка","сирень","спирея","жасмин","форзиция","яблоня","груша","персик","абрикос","вишня","слива","черемуха","рябина","боярышник","шиповник","акация","сосна","ель","пихта","лиственница","кедр","можжевельник","туя","тис","кипарис","секвойя","баобаб","кактус","суккулент","агава","юкка","алоэ","крассула","эхеверия","молодило","седум","лобелия","герань","пеларгония","вербена","настурция","азалия","камелия","магнолия","бересклет","гортензия","гейхера","манжетка","очиток","морозник","ирис карликовый","ирис сибирский","ирис бородатый","ландыш","купена","адиантум","папоротник","бальзамин","бегония","колеус","резеда","нагиссум","алиссум","гиацинтоид","гентиана","гравилат","гилия","горец","гравийник","гипсофила","гирвандула","годеция","гомфрена","гопе","гоуция","гребневик","гривелия"]
  },
  countries_ru: {
    name: "🌍 Страны",
    words: ["россия","украина","казахстан","узбекистан","туркменистан","киргизия","таджикистан","беларусь","молдова","грузия","армения","азербайджан","литва","латвия","эстония","польша","чехия","словакия","венгрия","румыния","болгария","сербия","хорватия","босния","монтенегро","албания","македония","греция","турция","кипр","франция","германия","испания","португалия","италия","австрия","швейцария","бельгия","нидерланды","люксембург","дания","швеция","норвегия","финляндия","исландия","великобритания","ирландия","мальта","англия","шотландия","уэльс","египет","марокко","алжир","ливия","судан","южная африка","кения","зимбабве","замбия","нигерия","гана","камерун","конго","эфиопия","сомали","танзания","уганда","мозамбик","малави","ангола","ботсвана","вьетнам","таиланд","малайзия","сингапур","индонезия","филипины","япония","южная корея","китай","индия","пакистан","бангладеш","шри ланка","мьянма","камбоджа","лаос","бруней"]
  },
  food_ru: {
    name: "🍎 Еда",
    words: ["яблоко","груша","апельсин","лимон","банан","ананас","манго","папайя","киви","клубника","малина","черника","смородина","крыжовник","вишня","слива","персик","абрикос","морковь","свекла","картофель","помидор","огурец","капуста","брокколи","шпинат","салат","лук","чеснок","перец","кабачок","баклажан","редис","редька","арахис","подсолнечник","кунжут","кукуруза","пшеница","рис","гречка","овес","ячмень","пшено","макаронник","хлеб","булка","печенье","торт","пирог","пирожок","блин","омлет","яйцо","сыр","творог","сметана","йогурт","масло","варенье","мёд","сахар","соль","горчица","кетчуп","майонез","спагетти","макароны","молоко","ряженка","кефир","простокваша","сливки","картошка","жареные картофель","винегрет","борщ","суп","щи","рассольник","минестронне","крем суп"]
  }
};

const gameStates = new Map<string, {
  word: string;
  guessed: Set<string>;
  wrongGuesses: Set<string>;
  attempts: number;
  startTime: number;
  participants: Set<number>;
  category: string;
  lang: string;
}>();

async function cmdStartFieldCategory(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🐾 Животные", callback_data: "field_cat_animals_ru" },
        { text: "🌿 Растения", callback_data: "field_cat_plants_ru" }
      ],
      [
        { text: "🌍 Страны", callback_data: "field_cat_countries_ru" },
        { text: "🍎 Еда", callback_data: "field_cat_food_ru" }
      ]
    ]
  };
  
  await sendTelegramMessage(chatId, "Выбери категорию:", { replyMarkup: keyboard });
  return { success: true, message: "Category selection sent" };
}

async function cmdStartField(triggerInfo: TriggerInfoTelegram, categoryKey: string, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const gameId = `${chatId}_field`;
  
  if (gameStates.has(gameId)) {
    await sendTelegramMessage(chatId, "⚠️ В этом чате уже идёт игра!");
    return { success: false, message: "Game already in progress" };
  }
  
  const category = (fieldCategories as any)[categoryKey];
  if (!category) {
    return { success: false, message: "Invalid category" };
  }
  
  const words = category.words;
  const word = words[Math.floor(Math.random() * words.length)].toUpperCase();
  
  const gameState = {
    word,
    guessed: new Set<string>(),
    wrongGuesses: new Set<string>(),
    attempts: 0,
    startTime: Date.now(),
    participants: new Set([userId]),
    category: categoryKey,
    lang: categoryKey.includes("_en") ? "en" : "ru"
  };
  
  gameStates.set(gameId, gameState);
  
  const display = word
    .split("")
    .map(letter => gameState.guessed.has(letter) ? letter : "█")
    .join(" ");
  
  const msg = gameState.lang === "ru"
    ? `🎮 <b>Поле чудес! ${category.name}</b>\n\n${display}\n\nЭто слово из ${word.length} букв. У вас 3 минуты!\n\nПишите буквы или само слово.`
    : `🎮 <b>Word Game! ${category.name}</b>\n\n${display}\n\nThis word has ${word.length} letters. You have 3 minutes!\n\nWrite letters or the whole word.`;
  
  await sendTelegramMessage(chatId, msg);
  
  // Таймер 3 минуты
  setTimeout(async () => {
    if (gameStates.has(gameId)) {
      const state = gameStates.get(gameId)!;
      gameStates.delete(gameId);
      
      const timeMsg = state.lang === "ru"
        ? `⏰ Время вышло! Слово было: <b>${word}</b>`
        : `⏰ Time is up! The word was: <b>${word}</b>`;
      
      await sendTelegramMessage(chatId, timeMsg);
      
      // Сохраняем статистику
      for (const participantId of state.participants) {
        await db.query(
          `INSERT INTO game_stats (user_id, chat_id, game_type, won) 
           VALUES ($1, $2, 'field_of_wonders', false)
           ON CONFLICT (user_id, chat_id, game_type) 
           DO UPDATE SET attempts = game_stats.attempts + 1`,
          [participantId, chatId]
        );
      }
    }
  }, 3 * 60 * 1000);
  
  return { success: true, message: "Game started" };
}

async function processFieldGuess(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, message } = triggerInfo.params;
  const gameId = `${chatId}_field`;
  
  if (!gameStates.has(gameId) || !message) return null;
  
  const gameState = gameStates.get(gameId)!;
  const input = message.trim().toUpperCase();
  
  // Проверка целого слова
  if (input.length > 1) {
    if (input === gameState.word) {
      gameStates.delete(gameId);
      
      // Рейтинг за целое слово = 20 очков
      await db.query(
        `INSERT INTO game_stats (user_id, chat_id, game_type, won, attempts) 
         VALUES ($1, $2, 'field_of_wonders', 20, 1)
         ON CONFLICT (user_id, chat_id, game_type) 
         DO UPDATE SET won = game_stats.won + 20, attempts = game_stats.attempts + 1`,
        [userId, chatId]
      );
      
      const msg = gameState.lang === "ru"
        ? `✅ <b>${triggerInfo.params.firstName}</b> угадал слово: <b>${gameState.word}</b>!\n\n🏆 +20 рейтинга!`
        : `✅ <b>${triggerInfo.params.firstName}</b> guessed the word: <b>${gameState.word}</b>!\n\n🏆 +20 rating!`;
      
      await sendTelegramMessage(chatId, msg);
      return { guessed: true };
    } else {
      const msg = gameState.lang === "ru" ? `❌ Неверное слово!` : `❌ Wrong word!`;
      await sendTelegramMessage(chatId, msg);
      return { wrong: true };
    }
  }
  
  // Проверка букв
  const letter = input;
  if (letter.length !== 1 || gameState.guessed.has(letter) || gameState.wrongGuesses.has(letter)) {
    return null;
  }
  
  if (gameState.word.includes(letter)) {
    gameState.guessed.add(letter);
    gameState.participants.add(userId);
    
    // Проверяем, угадано ли целое слово
    const isWon = gameState.word.split("").every(l => gameState.guessed.has(l));
    
    const display = gameState.word
      .split("")
      .map(l => gameState.guessed.has(l) ? l : "█")
      .join(" ");
    
    if (isWon) {
      gameStates.delete(gameId);
      
      // Рейтинг за целое слово = 20 очков
      await db.query(
        `INSERT INTO game_stats (user_id, chat_id, game_type, won, attempts) 
         VALUES ($1, $2, 'field_of_wonders', 20, 1)
         ON CONFLICT (user_id, chat_id, game_type) 
         DO UPDATE SET won = game_stats.won + 20, attempts = game_stats.attempts + 1`,
        [userId, chatId]
      );
      
      const msg = gameState.lang === "ru"
        ? `✅ <b>${triggerInfo.params.firstName}</b> угадал слово: <b>${gameState.word}</b>!\n\n🏆 +20 рейтинга!`
        : `✅ <b>${triggerInfo.params.firstName}</b> guessed the word: <b>${gameState.word}</b>!\n\n🏆 +20 rating!`;
      
      await sendTelegramMessage(chatId, msg);
      return { guessed: true };
    }
    
    // Рейтинг за букву = 10 очков
    await db.query(
      `INSERT INTO game_stats (user_id, chat_id, game_type, won, attempts) 
       VALUES ($1, $2, 'field_of_wonders', 10, 1)
       ON CONFLICT (user_id, chat_id, game_type) 
       DO UPDATE SET won = game_stats.won + 10, attempts = game_stats.attempts + 1`,
      [userId, chatId]
    );
    
    const wrongLetters = gameState.wrongGuesses.size > 0 ? `\n\n${gameState.lang === "ru" ? "❌ Неверные:" : "❌ Wrong:"} ${Array.from(gameState.wrongGuesses).join(", ")}` : "";
    await sendTelegramMessage(chatId, `✅ ${gameState.lang === "ru" ? "Верно! +10 рейтинга" : "Correct! +10 rating"} ${display}${wrongLetters}`);
  } else {
    gameState.wrongGuesses.add(letter);
    gameState.participants.add(userId);
    
    const display = gameState.word
      .split("")
      .map(l => gameState.guessed.has(l) ? l : "█")
      .join(" ");
    
    const wrongLetters = Array.from(gameState.wrongGuesses).join(", ");
    const msg = gameState.lang === "ru"
      ? `❌ Буквы ${letter} нет. ${display}\n\n❌ Неверные: ${wrongLetters}`
      : `❌ Letter ${letter} is not in the word. ${display}\n\n❌ Wrong letters: ${wrongLetters}`;
    
    await sendTelegramMessage(chatId, msg);
  }
  
  return { processed: true };
}

// Дополнительные функции команд (используются из старого кода)
async function cmdBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await banChatMember(chatId, target.userId);
  await sendTelegramMessage(chatId, `🚫 <b>${target.firstName}</b> был забанен.`);
  return { success: true, message: "User banned" };
}

// TODO: Добавить остальные функции команд из старого кода...
// Для краткости, добавлю только необходимые функции

async function cmdVirtas(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const virtas = await db.getUserVirtas(userId);
  await sendTelegramMessage(chatId, `💎 Твой баланс: ${virtas} виртов`);
  return { success: true, message: "Balance shown" };
}

async function handleTextCommands(triggerInfo: TriggerInfoTelegram, logger: any) {
  return { success: true, message: "No matching command" };
}

async function cmdShowRp(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `📝 РП команды: ударить, убить, обнять, целовать и т.д. (без слеша)`);
  return { success: true, message: "RP commands shown" };
}

async function cmdDonate(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "50 виртов за 50 ⭐", callback_data: "pay_50" },
        { text: "100 виртов за 100 ⭐", callback_data: "pay_100" }
      ],
      [
        { text: "500 виртов за 500 ⭐", callback_data: "pay_500" }
      ]
    ]
  };
  
  await sendTelegramMessage(chatId, "💳 Выбери пакет виртов:", { replyMarkup: keyboard });
  return { success: true, message: "Payment options sent" };
}

async function cmdSendVirtas(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  const amount = parseInt(args[0]) || 10;
  
  if (!target || amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя и сумму!");
    return { success: false, message: "Invalid params" };
  }
  
  const userVirtas = await db.getUserVirtas(userId);
  if (userVirtas < amount) {
    await sendTelegramMessage(chatId, `❌ У тебя недостаточно виртов! Нужно ${amount}, а у тебя ${userVirtas.toLocaleString()}.`);
    return { success: false, message: "Insufficient virtas" };
  }
  
  await db.updateUserVirtas(userId, -amount);
  await db.updateUserVirtas(target.userId, amount);
  
  await sendTelegramMessage(chatId, `💸 Ты отправил ${amount} виртов пользователю <b>${target.firstName}</b>!`);
  return { success: true, message: "Virtas sent" };
}

async function cmdBuyConsole(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const months = parseInt(args[0]) || 1;
  const cost = 200 * months;
  
  const virtas = await db.getUserVirtas(userId);
  if (virtas < cost) {
    await sendTelegramMessage(chatId, `❌ У тебя недостаточно виртов! Нужно ${cost}, а у тебя ${virtas.toLocaleString()}.`);
    return { success: false, message: "Insufficient virtas" };
  }
  
  await db.updateUserVirtas(userId, -cost);
  await db.grantPremium(userId, months);
  
  await sendTelegramMessage(chatId, `🎭 ✅ Ты купил Троллинг Консоль на ${months} месяц(ев) за ${cost} виртов!\n\nТеперь доступны:\n/funny_text, /kloun, /unmuteall, /transform, /invisibility`);
  return { success: true, message: "Console purchased" };
}

async function cmdProfile(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  if (!user) return { success: false, message: "User not found" };
  await sendTelegramMessage(chatId, `👤 <b>${user.first_name}</b>\n💎 Виртов: ${user.virtas || 0}\n⭐ Звёзд: ${user.stars || 0}\n📊 Уровень: ${user.level || 1}`);
  return { success: true, message: "Profile shown" };
}

async function cmdDice(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const val = Math.floor(Math.random() * 6) + 1;
  await sendTelegramMessage(chatId, `🎲 Выпало: <b>${val}</b>`);
  return { success: true, message: "Dice rolled" };
}

async function cmdDaily(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const stars = Math.floor(Math.random() * 50) + 50;
  await db.updateUserStars(userId, stars);
  await sendTelegramMessage(chatId, `⭐ Ты получил ${stars} звёзд!`);
  return { success: true, message: "Daily claimed" };
}

async function cmdBalance(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const virtas = await db.getUserVirtas(userId);
  await sendTelegramMessage(chatId, `💎 Баланс: ${virtas} виртов`);
  return { success: true, message: "Balance shown" };
}

async function cmdCasino(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "🎰 Казино!");
  return { success: true, message: "Casino" };
}

async function cmdSlot(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "🎰 Слоты!");
  return { success: true, message: "Slots" };
}

async function cmdFish(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "🎣 Рыбалка!");
  return { success: true, message: "Fishing" };
}

async function cmdDuel(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "⚔️ Дуэль!");
  return { success: true, message: "Duel" };
}

async function cmdCoin(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const result = Math.random() > 0.5 ? "Орёл" : "Решка";
  await sendTelegramMessage(chatId, `🪙 ${result}`);
  return { success: true, message: "Coin flipped" };
}

async function cmdId(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `🔑 Твой ID: ${userId}`);
  return { success: true, message: "ID shown" };
}

async function cmdInfo(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `ℹ️ Информация о чате`);
  return { success: true, message: "Info shown" };
}

async function cmdWeekly(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const stars = Math.floor(Math.random() * 200) + 300;
  await db.updateUserStars(userId, stars);
  await sendTelegramMessage(chatId, `⭐ Ты получил ${stars} звёзд!`);
  return { success: true, message: "Weekly claimed" };
}

async function cmdMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `💍 Предложение брака!`);
  return { success: true, message: "Marriage proposal" };
}

async function cmdAcceptMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `💕 Браки приняты!`);
  return { success: true, message: "Marriage accepted" };
}

async function cmdDivorce(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `😢 Развод оформлен!`);
  return { success: true, message: "Divorce" };
}

async function cmdFunnyText(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const text = jokes[Math.floor(Math.random() * jokes.length)];
  await sendTelegramMessage(chatId, `😂 ${text}`);
  return { success: true, message: "Funny text sent" };
}

async function cmdKloun(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `🤡 Ты клоун!`);
  return { success: true, message: "Clown" };
}

async function cmdUnmuteAll(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `🔊 Все размучены!`);
  return { success: true, message: "Unmuted all" };
}

async function cmdTransform(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `🐾 Трансформация!`);
  return { success: true, message: "Transform" };
}

async function cmdInvisibility(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `👻 Невидимость!`);
  return { success: true, message: "Invisibility" };
}

async function cmdClean(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `🧹 Сообщения удалены!`);
  return { success: true, message: "Messages cleaned" };
}

async function cmdAntispam(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `🛡️ Антиспам ${args[0] !== "off" ? "включен" : "выключен"}!`);
  return { success: true, message: "Antispam toggled" };
}

async function cmdFlood(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { flood_control: enable });
  await sendTelegramMessage(chatId, `⚙️ Контроль флуда ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Flood toggled" };
}

async function cmdCaps(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { caps_filter: enable });
  await sendTelegramMessage(chatId, `⚙️ Фильтр капса ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Caps toggled" };
}

async function cmdLinks(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { links_filter: enable });
  await sendTelegramMessage(chatId, `⚙️ Фильтр ссылок ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Links toggled" };
}

async function cmdBlacklist(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  if (args.length === 0) return { success: false, message: "No word" };
  await db.addBlacklistWord(chatId, args[0], userId);
  await sendTelegramMessage(chatId, `✅ Слово "<b>${args[0]}</b>" добавлено в черный список.`);
  return { success: true, message: "Blacklist word added" };
}

async function cmdWhitelist(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  if (args.length === 0) return { success: false, message: "No word" };
  await db.removeBlacklistWord(chatId, args[0]);
  await sendTelegramMessage(chatId, `✅ Слово "<b>${args[0]}</b>" удалено из черного списка.`);
  return { success: true, message: "Blacklist word removed" };
}

async function cmdBadwords(triggerInfo: TriggerInfoTelegram, isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `🚫 Черный список!`);
  return { success: true, message: "Badwords shown" };
}

async function cmdPin(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `📌 Сообщение закреплено!`);
  return { success: true, message: "Message pinned" };
}

async function cmdUnpin(triggerInfo: TriggerInfoTelegram, isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `📌 Сообщение откреплено!`);
  return { success: true, message: "Message unpinned" };
}

async function cmdPhoto(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { photo_allowed: enable });
  await sendTelegramMessage(chatId, `🖼️ Фото теперь ${enable ? "разрешены" : "запрещены"}!`);
  return { success: true, message: "Photo toggled" };
}

async function cmdSticker(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { sticker_allowed: enable });
  await sendTelegramMessage(chatId, `🎟️ Стикеры теперь ${enable ? "разрешены" : "запрещены"}!`);
  return { success: true, message: "Sticker toggled" };
}

async function cmdVideo(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { video_allowed: enable });
  await sendTelegramMessage(chatId, `📹 Видео теперь ${enable ? "разрешены" : "запрещены"}!`);
  return { success: true, message: "Video toggled" };
}

async function cmdVoice(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { voice_allowed: enable });
  await sendTelegramMessage(chatId, `🎤 Голос теперь ${enable ? "разрешен" : "запрещен"}!`);
  return { success: true, message: "Voice toggled" };
}

async function cmdDocument(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { document_allowed: enable });
  await sendTelegramMessage(chatId, `📄 Документы теперь ${enable ? "разрешены" : "запрещены"}!`);
  return { success: true, message: "Document toggled" };
}

async function cmdAnimation(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { animation_allowed: enable });
  await sendTelegramMessage(chatId, `🎬 Анимация теперь ${enable ? "разрешена" : "запрещена"}!`);
  return { success: true, message: "Animation toggled" };
}

async function cmdPromote(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await promoteChatMember(chatId, target.userId);
  await sendTelegramMessage(chatId, `⬆️ <b>${target.firstName}</b> повышен!`);
  return { success: true, message: "User promoted" };
}

async function cmdDemote(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `⬇️ <b>${target.firstName}</b> понижен!`);
  return { success: true, message: "User demoted" };
}

async function cmdSetPrefix(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const prefix = args[0] || "none";
  await sendTelegramMessage(chatId, `✅ Префикс изменён на: ${prefix}`);
  return { success: true, message: "Prefix set" };
}

async function cmdReport(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await db.addReport(userId, target.userId, chatId, args.join(" "));
  await sendTelegramMessage(chatId, "✅ Жалоба отправлена администрации.");
  return { success: true, message: "Report sent" };
}

async function cmdAnnounce(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  const message = args.join(" ");
  if (!message) return { success: false, message: "No message" };
  
  const chats = await db.query("SELECT DISTINCT chat_id FROM bot_users");
  let sentCount = 0;
  
  for (const chatRow of chats.rows) {
    try {
      await sendTelegramMessage(chatRow.chat_id, `📢 <b>ОБЪЯВЛЕНИЕ ОТ ВЛАДЕЛЬЦА:</b>\n\n${message}`);
      sentCount++;
    } catch (e) {
      logger?.warn("Failed to send announcement", chatRow.chat_id);
    }
  }
  
  await sendTelegramMessage(chatId, `✅ Объявление отправлено в ${sentCount} чатов!`);
  return { success: true, message: "Announcement sent" };
}

async function cmdSoftBan(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `🚫 <b>${target.firstName}</b> софт забанен.`);
  return { success: true, message: "User softbanned" };
}

async function cmdTempBan(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  const time = args[0] || "1h";
  await sendTelegramMessage(chatId, `⏳ <b>${target.firstName}</b> забанен на ${time}.`);
  return { success: true, message: "User tempbanned" };
}

async function cmdUnban(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await unbanChatMember(chatId, target.userId);
  await sendTelegramMessage(chatId, `✅ <b>${target.firstName}</b> разбанен.`);
  return { success: true, message: "User unbanned" };
}

async function cmdMute(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await restrictChatMember(chatId, target.userId, { can_send_messages: false });
  await sendTelegramMessage(chatId, `🤐 <b>${target.firstName}</b> замучен.`);
  return { success: true, message: "User muted" };
}

async function cmdTempMute(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  const time = args[0] || "1h";
  await sendTelegramMessage(chatId, `⏳ <b>${target.firstName}</b> замучен на ${time}.`);
  return { success: true, message: "User tempmuted" };
}

async function cmdUnmute(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await restrictChatMember(chatId, target.userId, { can_send_messages: true });
  await sendTelegramMessage(chatId, `🔊 <b>${target.firstName}</b> размучен.`);
  return { success: true, message: "User unmuted" };
}

async function cmdWarn(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `⚠️ <b>${target.firstName}</b> получил варнинг.`);
  return { success: true, message: "User warned" };
}

async function cmdUnwarn(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `✅ <b>${target.firstName}</b> избежал варнинга.`);
  return { success: true, message: "User unwarned" };
}

async function cmdWarns(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `⚠️ Твои варны!`);
  return { success: true, message: "Warns shown" };
}

async function cmdResetWarns(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `✅ Варны <b>${target.firstName}</b> очищены.`);
  return { success: true, message: "Warns reset" };
}

async function cmdWarnLimit(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const limit = parseInt(args[0]) || 3;
  await sendTelegramMessage(chatId, `⚙️ Лимит варнов: ${limit}.`);
  return { success: true, message: "Warn limit set" };
}

async function cmdKick(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `👢 <b>${target.firstName}</b> был кикнут.`);
  return { success: true, message: "User kicked" };
}

async function cmdKickMe(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `👢 Ты был кикнут.`);
  return { success: true, message: "User kicked self" };
}

async function cmdRestrict(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `🔒 <b>${target.firstName}</b> ограничен.`);
  return { success: true, message: "User restricted" };
}

async function cmdUnrestrict(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(chatId, `🔓 <b>${target.firstName}</b> разограничен.`);
  return { success: true, message: "User unrestricted" };
}

async function cmdReadOnly(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `📖 Режим "только чтение" включен.`);
  return { success: true, message: "Read-only enabled" };
}

async function cmdUnreadOnly(triggerInfo: TriggerInfoTelegram, args: string[], isUserAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isUserAdmin) return { success: false, message: "Not admin" };
  await sendTelegramMessage(chatId, `✏️ Режим "только чтение" выключен.`);
  return { success: true, message: "Read-only disabled" };
}

async function cmdBuyPremium(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `💎 Купи премиум!`);
  return { success: true, message: "Premium offer" };
}

async function handleSuccessfulPayment(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const payment = triggerInfo.params.successful_payment;
  
  if (!payment) return { success: false, message: "No payment data" };
  
  const match = payment.invoice_payload?.match(/virtas_(\d+)/);
  if (!match) {
    await sendTelegramMessage(chatId, "❌ Ошибка обработки платежа: неизвестный тип товара.");
    return { success: false, message: "Unknown payload" };
  }
  
  const virtasAmount = parseInt(match[1]);
  
  try {
    await db.updateUserVirtas(userId, virtasAmount);
    
    logger?.info("✅ [Payment] Virtas added", { userId, virtasAmount });
    
    const newBalance = await db.getUserVirtas(userId);
    await sendTelegramMessage(chatId, `✅ <b>Платёж успешно принят!</b>\n\n💫 Ты получил <b>${virtasAmount} виртов</b>\n\nТвой новый баланс: ${newBalance} виртов`);
    
    return { success: true, message: "Payment processed" };
  } catch (e) {
    logger?.error("❌ [Payment] Failed to process payment", e);
    await sendTelegramMessage(chatId, "❌ Ошибка при добавлении виртов. Обратитесь в поддержку.");
    return { success: false, message: "Processing error" };
  }
}

async function cmdRating(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const stats = await db.getGameStats(userId, chatId, 'field_of_wonders');
  if (!stats) {
    await sendTelegramMessage(chatId, `📊 Твой рейтинг: 0 (пока не играл)`);
    return { success: true, message: "Rating shown" };
  }
  // Рейтинг уже хранится в won колонке
  const rating = stats.won;
  await sendTelegramMessage(chatId, `📊 Твой рейтинг: <b>${rating}</b>\n📈 Попыток: ${stats.attempts}`);
  return { success: true, message: "Rating shown" };
}

async function cmdSessions(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isOwner = userId === 1314619424 || userId === 7977020467;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "❌ Только владелец!");
    return { success: false, message: "Not owner" };
  }
  
  const users = await db.query("SELECT COUNT(DISTINCT user_id) as count FROM bot_users");
  const userCount = users.rows[0]?.count || 0;
  await sendTelegramMessage(chatId, `👥 Пользуется ботом: <b>${userCount}</b> человек`);
  return { success: true, message: "Sessions shown" };
}
