import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as db from "./database";
import {
  sendTelegramMessage,
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
  unpinChatMessage,
  getChat,
  exportChatInviteLink,
  editMessageText,
  TriggerInfoTelegram,
} from "../../triggers/telegramTriggers";

const OWNER_USERNAME = "n777snickers777";
const PREMIUM_PRICE = 200; // в звёздах

const jokes = [
  "Почему программисты не любят природу? Слишком много багов! 🐛",
  "Жена программиста: - Сходи в магазин, купи батон хлеба. Если будут яйца - возьми десяток. Программист вернулся с 10 батонами хлеба. 🍞",
  "- Алло, это прачечная? - Нет, это программисты. - А почему вы мне белье стираете? - Мы не стираем, мы логи чистим!",
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
    
    const { chatId, userId, userName, firstName, lastName, command, commandArgs, isCallback, callbackData, callbackId } = triggerInfo.params;
    
    logger?.info("🤖 [BotCommand] Processing", { command, userId, chatId, isCallback, callbackData });
    
    await db.getOrCreateUser(userId, chatId, userName, firstName, lastName);
    await db.getOrCreateChat(chatId, triggerInfo.params.chatTitle, triggerInfo.params.chatType);
    
    if (isCallback && callbackId) {
      return await handleCallback(triggerInfo, logger);
    }
    
    if (!command) {
      await db.updateMessageStats(userId, chatId);
      return await handleNonCommand(triggerInfo, logger);
    }
    
    const args = commandArgs || [];
    const isOwnerUser = userName?.toLowerCase() === OWNER_USERNAME || userId === 1314619424;
    const isUserAdmin = (await isAdmin(chatId, userId)) || isOwnerUser;
    
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
        case "ro":
          return await cmdReadOnly(triggerInfo, true, isUserAdmin, logger);
        case "unro":
          return await cmdReadOnly(triggerInfo, false, isUserAdmin, logger);
        
        case "warn":
          return await cmdWarn(triggerInfo, args, isUserAdmin, logger);
        case "unwarn":
          return await cmdUnwarn(triggerInfo, isUserAdmin, logger);
        case "warns":
          return await cmdWarns(triggerInfo, logger);
        case "resetwarns":
          return await cmdResetWarns(triggerInfo, isUserAdmin, logger);
        case "warnlimit":
          return await cmdWarnLimit(triggerInfo, args, isUserAdmin, logger);
        
        case "kick":
          return await cmdKick(triggerInfo, args, isUserAdmin, logger);
        case "kickme":
          return await cmdKickMe(triggerInfo, logger);
        case "restrict":
          return await cmdRestrict(triggerInfo, isUserAdmin, logger);
        case "unrestrict":
          return await cmdUnrestrict(triggerInfo, isUserAdmin, logger);
        
        case "antispam":
          return await cmdAntispam(triggerInfo, args, isUserAdmin, logger);
        case "flood":
          return await cmdFlood(triggerInfo, args, isUserAdmin, logger);
        case "blacklist":
          return await cmdBlacklist(triggerInfo, args, isUserAdmin, logger);
        case "whitelist":
          return await cmdWhitelist(triggerInfo, args, isUserAdmin, logger);
        case "caps":
          return await cmdCaps(triggerInfo, args, isUserAdmin, logger);
        case "links":
          return await cmdLinks(triggerInfo, args, isUserAdmin, logger);
        case "badwords":
          return await cmdBadwords(triggerInfo, logger);
        
        case "info":
          return await cmdInfo(triggerInfo, logger);
        case "id":
          return await cmdId(triggerInfo, logger);
        case "whois":
          return await cmdWhois(triggerInfo, logger);
        case "who_today":
        case "кто_сегодня":
          return await cmdWhoToday(triggerInfo, args, logger);
        case "photo":
        case "photos":
        case "media":
          if (args[0] === "запретить" || args[0] === "off") {
            await db.updateChatSettings(chatId, { photo_allowed: false });
            await sendTelegramMessage(chatId, "🚫 Фото теперь запрещены!");
            return { success: true, message: "Photos disabled" };
          } else if (args[0] === "разрешить" || args[0] === "on") {
            await db.updateChatSettings(chatId, { photo_allowed: true });
            await sendTelegramMessage(chatId, "✅ Фото теперь разрешены!");
            return { success: true, message: "Photos enabled" };
          }
          break;
        case "sticker":
        case "stickers":
          if (args[0] === "запретить" || args[0] === "off") {
            await db.updateChatSettings(chatId, { sticker_allowed: false });
            await sendTelegramMessage(chatId, "🚫 Стикеры теперь запрещены!");
            return { success: true, message: "Stickers disabled" };
          } else if (args[0] === "разрешить" || args[0] === "on") {
            await db.updateChatSettings(chatId, { sticker_allowed: true });
            await sendTelegramMessage(chatId, "✅ Стикеры теперь разрешены!");
            return { success: true, message: "Stickers enabled" };
          }
          break;
        case "video":
          if (args[0] === "запретить" || args[0] === "off") {
            await db.updateChatSettings(chatId, { video_allowed: false });
            await sendTelegramMessage(chatId, "🚫 Видео теперь запрещены!");
            return { success: true, message: "Video disabled" };
          } else if (args[0] === "разрешить" || args[0] === "on") {
            await db.updateChatSettings(chatId, { video_allowed: true });
            await sendTelegramMessage(chatId, "✅ Видео теперь разрешены!");
            return { success: true, message: "Video enabled" };
          }
          break;
        case "voice":
          if (args[0] === "запретить" || args[0] === "off") {
            await db.updateChatSettings(chatId, { voice_allowed: false });
            await sendTelegramMessage(chatId, "🚫 Голосовые теперь запрещены!");
            return { success: true, message: "Voice disabled" };
          } else if (args[0] === "разрешить" || args[0] === "on") {
            await db.updateChatSettings(chatId, { voice_allowed: true });
            await sendTelegramMessage(chatId, "✅ Голосовые теперь разрешены!");
            return { success: true, message: "Voice enabled" };
          }
          break;
        case "profile":
        case "me":
          return await cmdProfile(triggerInfo, logger);
        case "users":
          return await cmdUsers(triggerInfo, logger);
        case "admins":
        case "adminlist":
          return await cmdAdmins(triggerInfo, logger);
        case "mods":
        case "modlist":
          return await cmdMods(triggerInfo, logger);
        
        case "chat_info":
          return await cmdChatInfo(triggerInfo, logger);
        case "stats":
          return await cmdStats(triggerInfo, logger);
        case "top_activity":
        case "top":
          return await cmdTopActivity(triggerInfo, logger);
        case "top_warns":
          return await cmdTopWarns(triggerInfo, logger);
        case "my_stats":
          return await cmdMyStats(triggerInfo, logger);
        case "user_count":
          return await cmdUserCount(triggerInfo, logger);
        case "message_count":
          return await cmdMessageCount(triggerInfo, logger);
        
        case "rank":
          return await cmdRank(triggerInfo, logger);
        case "level":
          return await cmdLevel(triggerInfo, logger);
        case "leaderboard":
          return await cmdLeaderboard(triggerInfo, logger);
        case "reputation":
          return await cmdReputation(triggerInfo, logger);
        case "rep_top":
          return await cmdRepTop(triggerInfo, logger);
        case "award":
          return await cmdAward(triggerInfo, args, isOwnerUser || isUserAdmin, logger);
        
        case "set_welcome":
          return await cmdSetWelcome(triggerInfo, args, isUserAdmin, logger);
        case "set_rules":
          return await cmdSetRules(triggerInfo, args, isUserAdmin, logger);
        case "rules":
          return await cmdRules(triggerInfo, logger);
        case "set_goodbye":
          return await cmdSetGoodbye(triggerInfo, args, isUserAdmin, logger);
        case "welcome":
          return await cmdWelcomeToggle(triggerInfo, args, isUserAdmin, logger);
        
        case "set_lang":
          return await cmdSetLang(triggerInfo, args, isUserAdmin, logger);
        case "log_channel":
          return await cmdLogChannel(triggerInfo, args, isUserAdmin, logger);
        case "report_channel":
          return await cmdReportChannel(triggerInfo, args, isUserAdmin, logger);
        case "auto_delete":
          return await cmdAutoDelete(triggerInfo, args, isUserAdmin, logger);
        case "clean_service":
          return await cmdCleanService(triggerInfo, args, isUserAdmin, logger);
        
        case "media_limit":
          return await cmdMediaLimit(triggerInfo, args, isUserAdmin, logger);
        case "sticker_limit":
          return await cmdStickerLimit(triggerInfo, args, isUserAdmin, logger);
        case "gif_limit":
          return await cmdGifLimit(triggerInfo, args, isUserAdmin, logger);
        case "voice_limit":
          return await cmdVoiceLimit(triggerInfo, args, isUserAdmin, logger);
        case "forward_limit":
          return await cmdForwardLimit(triggerInfo, args, isUserAdmin, logger);
        
        case "report":
          return await cmdReport(triggerInfo, args, logger);
        case "compliment":
          return await cmdCompliment(triggerInfo, logger);
        case "thank":
          return await cmdThank(triggerInfo, logger);
        case "rep":
          return await cmdRep(triggerInfo, logger);
        case "marry":
          return await cmdMarry(triggerInfo, logger);
        
        case "bio":
          return await cmdBio(triggerInfo, args, logger);
        case "afk":
          return await cmdAfk(triggerInfo, args, logger);
        case "back":
          return await cmdBack(triggerInfo, logger);
        case "bonus":
          return await cmdBonus(triggerInfo, logger);
        
        case "stars":
        case "balance":
          return await cmdBalance(triggerInfo, logger);
        case "shop":
          return await cmdShop(triggerInfo, logger);
        case "buy":
          return await cmdBuy(triggerInfo, args, logger);
        case "prefixes":
        case "my_prefixes":
          return await cmdMyPrefixes(triggerInfo, logger);
        case "setprefix":
        case "set_prefix":
          return await cmdSetPrefix(triggerInfo, args, logger);
        case "buy_premium":
        case "premium":
          return await cmdBuyPremium(triggerInfo, logger);
        case "give_premium":
          return await cmdGivePremium(triggerInfo, args, isOwnerUser, logger);
        case "give_stars":
          return await cmdGiveStars(triggerInfo, args, isOwnerUser, logger);
        case "transfer":
          return await cmdTransfer(triggerInfo, args, logger);
        case "daily":
          return await cmdDaily(triggerInfo, logger);
        case "weekly":
          return await cmdWeekly(triggerInfo, logger);
        case "pay":
          return await cmdPay(triggerInfo, args, logger);
        case "top_rich":
          return await cmdTopRich(triggerInfo, logger);
        case "fish":
          return await cmdFish(triggerInfo, args, logger);
        case "duel":
          return await cmdDuel(triggerInfo, logger);
        case "smeshnoy_text":
        case "funny_text":
          return await cmdSmeshnoyText(triggerInfo, logger);
        case "kloun":
        case "clown":
          return await cmdKloun(triggerInfo, logger);
        case "unmuteall":
          return await cmdUnmuteAll(triggerInfo, logger);
        case "transform":
        case "превратить":
          return await cmdTransform(triggerInfo, args, logger);

        case "karma":
          return await cmdKarma(triggerInfo, logger);
        case "gift":
          return await cmdGift(triggerInfo, args, logger);
        case "hug":
          return await cmdHug(triggerInfo, logger);
        case "coin":
          return await cmdCoin(triggerInfo, logger);
        case "random":
          return await cmdRandom(triggerInfo, args, logger);
        
        case "roll":
        case "dice":
          return await cmdDice(triggerInfo, logger);
        case "casino":
          return await cmdCasino(triggerInfo, args, logger);
        case "slot":
          return await cmdSlot(triggerInfo, args, logger);
        case "guess":
          return await cmdGuess(triggerInfo, args, logger);
        
        case "quiz":
          return await cmdQuiz(triggerInfo, logger);
        case "trivia":
          return await cmdTrivia(triggerInfo, logger);
        case "test":
          return await cmdTest(triggerInfo, logger);
        case "compat":
          return await cmdCompat(triggerInfo, logger);
        case "rate":
          return await cmdRate(triggerInfo, args, logger);
        
        case "joke":
          return await cmdJoke(triggerInfo, logger);
        case "fact":
          return await cmdFact(triggerInfo, logger);
        case "quote":
          return await cmdQuote(triggerInfo, logger);
        case "cat":
          return await cmdCat(triggerInfo, logger);
        case "dog":
          return await cmdDog(triggerInfo, logger);
        
        case "addcoins":
        case "add_coins":
          return await cmdAddCoins(triggerInfo, args, isOwnerUser, logger);
        case "givepremium":
          return await cmdGivePremium(triggerInfo, args, isOwnerUser, logger);
        case "givestars":
          return await cmdGiveStars(triggerInfo, args, isOwnerUser, logger);

        case "promote":
          return await cmdPromote(triggerInfo, isUserAdmin, logger);
        case "demote":
          return await cmdDemote(triggerInfo, isUserAdmin, logger);
        
        case "clean":
          return await cmdClean(triggerInfo, args, isUserAdmin, logger);
        case "clean_all":
          return await cmdCleanAll(triggerInfo, isUserAdmin, logger);
        case "pin":
          return await cmdPin(triggerInfo, isUserAdmin, logger);
        case "unpin":
          return await cmdUnpin(triggerInfo, isUserAdmin, logger);
        case "invite":
          return await cmdInvite(triggerInfo, isUserAdmin, logger);
        case "backup":
          return await cmdBackup(triggerInfo, isUserAdmin, logger);
        
        
        default:
          return { success: true, message: "Unknown command" };
      }
    } catch (error) {
      logger?.error("❌ [BotCommand] Error", { error, command });
      return { success: false, message: String(error) };
    }
  },
});

async function handleCallback(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, callbackId, callbackData, userId } = triggerInfo.params;
  
  if (!callbackData) {
    await answerCallback(callbackId!, "Неизвестная кнопка");
    return { success: true, message: "Unknown callback" };
  }
  
  const [action, ...params] = callbackData.split(":");
  
  switch (action) {
    case "buy_prefix":
      const prefixId = parseInt(params[0]);
      const result = await db.buyPrefix(userId, chatId, prefixId);
      await answerCallback(callbackId!, result.message, !result.success);
      return { success: result.success, message: result.message };
      
    case "set_prefix":
      const prefixDisplay = params.join(":");
      await db.setUserPrefix(userId, chatId, prefixDisplay);
      await answerCallback(callbackId!, `Префикс установлен: ${prefixDisplay}`);
      return { success: true, message: "Prefix set" };
      
    default:
      await answerCallback(callbackId!, "Обработано");
      return { success: true, message: "Callback handled" };
  }
}

async function handleNonCommand(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, userName, firstName, message, newMembers, leftMember, hasMedia, mediaType, isForwarded, hasLinks, mentionedUsers } = triggerInfo.params;
  
  if (message) {
    // Check funny_text effect
    const funnyRes = await db.query("SELECT reason FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = 'funny_text' AND expires_at > NOW()", [userId, chatId]);
    if (funnyRes.rows.length > 0) {
      const funnyPhrase = funnyRes.rows[0].reason;
      await deleteMessage(chatId, triggerInfo.params.messageId);
      for (let i = 0; i < 5; i++) {
        await sendTelegramMessage(chatId, `<b>${firstName}</b>: ${funnyPhrase}`);
      }
      return { success: true, message: "Funny text replacement triggered" };
    }
  }

  // Проверка настроек чата для медиа
  const chatSettings = await db.getChatSettings(chatId);
  if (chatSettings) {
    let restrictionType: string | null = null;
    if (mediaType === "photo" && !chatSettings.photo_allowed) restrictionType = "фото";
    if (mediaType === "sticker" && !chatSettings.sticker_allowed) restrictionType = "стикеры";
    if (mediaType === "video" && !chatSettings.video_allowed) restrictionType = "видео";
    if (mediaType === "voice" && !chatSettings.voice_allowed) restrictionType = "голосовые";
    if (hasLinks && !chatSettings.links_allowed) restrictionType = "ссылки";

    if (restrictionType) {
      const isOwnerUser = userName?.toLowerCase() === OWNER_USERNAME || userId === 1314619424;
      const isUserAdmin = (await isAdmin(chatId, userId)) || isOwnerUser;
      
      if (!isUserAdmin) {
        await deleteMessage(chatId, triggerInfo.params.messageId);
        // Не спамим сообщением о запрете, просто удаляем
        return { success: true, message: `Media ${restrictionType} restricted and deleted` };
      }
    }
  }

  // Текстовые RP-команды (без слеша)
  const rpCommands: Record<string, string> = {
    "ударить": "👊 {user} ударил {target}!",
    "убить": "☠️ {user} убил {target}!",
    "выстрелить": "🔫 {user} выстрелил в {target}!",
    "зарезать": "🔪 {user} зарезал {target}!",
    "отравить": "🧪 {user} отравил {target}!",
    "взорвать": "💥 {user} взорвал {target}!",
    "сжечь": "🔥 {user} сжёг {target}!",
    "задушить": "🧤 {user} задушил {target}!",
    "толкнуть": "✋ {user} толкнул {target}!",
    "пнуть": "🦵 {user} пнул {target}!",
    "связать": "🪢 {user} связал {target}!",
    "арестовать": "👮 {user} арестовал {target}!",
    "обезглавить": "🪓 {user} обезглавил {target}!",
    "расстрелять": "🔫 {user} расстрелял {target}!",
    "обнять": "🫂 {user} обнял {target}!",
    "целовать": "💋 {user} поцеловал {target}!",
    "погладить": "🖐 {user} погладил {target}!",
    "улыбнуться": "😊 {user} улыбнулся {target}!",
    "подмигнуть": "😉 {user} подмигнул {target}!",
    "пожать": "🤝 {user} пожал руку {target}!",
    "утешить": "🧸 {user} утешил {target}!",
    "похвалить": "👏 {user} похвалил {target}!",
    "танец": "💃 {user} станцевал с {target}!",
    "комплимент": "✨ {user} сделал комплимент {target}!",
    "ужин": "🍽 {user} поужинал с {target}!",
    "цветы": "💐 {user} подарил цветы {target}!",
    "серенада": "🎸 {user} спел серенаду для {target}!",
    "смеяться": "😂 {user} посмеялся над {target}!",
    "плакать": "😭 {user} заплакал перед {target}!",
    "вздохнуть": "😮‍💨 {user} вздохнул, глядя на {target}!",
    "нахмуриться": "🤨 {user} нахмурился на {target}!",
    "удивиться": "😲 {user} удивился {target}!",
    "испугаться": "😨 {user} испугался {target}!",
    "разозлиться": "😡 {user} разозлился на {target}!",
    "восхититься": "🤩 {user} восхитился {target}!",
    "усмехнуться": "😏 {user} усмехнулся {target}!",
    "бежать": "🏃 {user} побежал к {target}!",
    "спрятаться": "🫣 {user} спрятался от {target}!",
    "замереть": "🧍 {user} замер перед {target}!",
    "присесть": "🧎 {user} присел рядом с {target}!",
    "лечь": "🛌 {user} лег рядом с {target}!",
    "встать": "🧍 {user} встал перед {target}!",
    "прыгнуть": "🦘 {user} прыгнул на {target}!",
    "нырнуть": "🤿 {user} нырнул к {target}!",
    "кивнуть": "🫡 {user} кивнул {target}!",
    "заморозить": "🧊 {user} заморозил {target}!",
    "поджечь": "🔥 {user} поджёг {target}!",
    "ослепить": "🙈 {user} ослепил {target}!",
    "молния": "⚡ {user} ударил молнией {target}!",
    "проклятие": "🧙‍♂️ {user} проклял {target}!",
    "снять": "✨ {user} снял проклятие с {target}!",
    "исцелить": "🩹 {user} исцелил {target}!",
    "воскресить": "👼 {user} воскресил {target}!"
  };
  
  const lowerMsg = message?.toLowerCase() || "";
  
  // Текстовые команды (без слеша)
  const moderationTriggers: Record<string, string> = {
    "бан": "ban",
    "разбан": "unban",
    "мут": "mute",
    "размут": "unmute",
    "кик": "kick",
    "варн": "warn",
  };

  for (const [trigger, cmdName] of Object.entries(moderationTriggers)) {
    if (lowerMsg === trigger || lowerMsg.startsWith(trigger + " ")) {
      const args = message ? message.split(" ").slice(1) : [];
      const isOwnerUser = triggerInfo.params.userName?.toLowerCase() === OWNER_USERNAME || triggerInfo.params.userId === 1314619424;
      const isUserAdmin = (await isAdmin(chatId, userId)) || isOwnerUser;
      logger?.info("🛡️ [BotCommand] Text moderation trigger", { trigger, cmdName, isUserAdmin });
      
      if (!isUserAdmin) {
        await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
        return { success: false, message: "Not admin" };
      }

      switch (cmdName) {
        case "ban": return await cmdBan(triggerInfo, args, isUserAdmin, logger);
        case "unban": return await cmdUnban(triggerInfo, args, isUserAdmin, logger);
        case "mute": return await cmdMute(triggerInfo, args, isUserAdmin, logger);
        case "unmute": return await cmdUnmute(triggerInfo, args, isUserAdmin, logger);
        case "kick": return await cmdKick(triggerInfo, args, isUserAdmin, logger);
        case "warn": return await cmdWarn(triggerInfo, args, isUserAdmin, logger);
      }
    }
  }

  // Текстовые RP-команды (без слеша)
  for (const [cmd, template] of Object.entries(rpCommands)) {
    if (lowerMsg.includes(cmd)) {
      logger?.info("🎭 [BotCommand] RP command trigger", { cmd });
      const target = mentionedUsers.length > 0 ? mentionedUsers[0] : (triggerInfo.params.replyToMessage?.from ? triggerInfo.params.replyToMessage.from : undefined);
      
      const targetName = target ? (target.first_name || (target.username ? `@${target.username}` : `ID:${target.id}`)) : "кого-то";
      const text = template
        .replace("{user}", firstName)
        .replace("{target}", targetName);
      
      await sendTelegramMessage(chatId, text);
      return { success: true, message: "RP command executed" };
    }
  }

  if (newMembers && newMembers.length > 0) {
    const chatSettings = await db.getChatSettings(chatId);
    if (chatSettings?.welcome_enabled) {
      for (const member of newMembers) {
        await db.getOrCreateUser(member.id, chatId, member.username, member.first_name, member.last_name);
        const welcomeMsg = (chatSettings.welcome_message || "Добро пожаловать, {username}! 👋")
          .replace("{username}", member.first_name || member.username || "друг");
        await sendTelegramMessage(chatId, welcomeMsg);
      }
    }
    return { success: true, message: "Welcome sent" };
  }
  
  if (leftMember) {
    const settings = await db.getChatSettings(chatId);
    if (settings?.goodbye_enabled) {
      const goodbyeMsg = (settings.goodbye_message || "До свидания, {username}! 👋")
        .replace("{username}", leftMember.first_name || leftMember.username || "друг");
      await sendTelegramMessage(chatId, goodbyeMsg);
    }
    return { success: true, message: "Goodbye sent" };
  }
  
  const settings = await db.getChatSettings(chatId);
  
  if (settings?.antispam_enabled && message) {
    const blacklist = await db.getBlacklistWords(chatId);
    const lowerMsg = message.toLowerCase();
    for (const word of blacklist) {
      if (lowerMsg.includes(word)) {
        await deleteMessage(chatId, triggerInfo.params.messageId);
        await sendTelegramMessage(chatId, `⚠️ @${userName}, ваше сообщение удалено за использование запрещённых слов.`);
        return { success: true, message: "Message deleted for blacklist" };
      }
    }
    
    if (!settings.links_allowed && hasLinks) {
      const userAdmin = await isAdmin(chatId, userId);
      if (!userAdmin) {
        await deleteMessage(chatId, triggerInfo.params.messageId);
        await sendTelegramMessage(chatId, `⚠️ @${userName}, ссылки запрещены в этом чате.`);
        return { success: true, message: "Links not allowed" };
      }
    }
    
    if (settings.caps_limit > 0 && message.length > 10) {
      const capsCount = (message.match(/[A-ZА-ЯЁ]/g) || []).length;
      const capsPercent = (capsCount / message.length) * 100;
      if (capsPercent > settings.caps_limit) {
        await deleteMessage(chatId, triggerInfo.params.messageId);
        await sendTelegramMessage(chatId, `⚠️ @${userName}, слишком много заглавных букв!`);
        return { success: true, message: "Caps limit exceeded" };
      }
    }
  }
  
  if (settings?.media_limit && hasMedia && (mediaType === "photo" || mediaType === "video")) {
    const userAdmin = await isAdmin(chatId, userId);
    if (!userAdmin) {
      await deleteMessage(chatId, triggerInfo.params.messageId);
      await sendTelegramMessage(chatId, `⚠️ @${userName}, фото и видео запрещены в этом чате.`);
      return { success: true, message: "Media not allowed" };
    }
  }
  
  if (settings?.sticker_limit && mediaType === "sticker") {
    const userAdmin = await isAdmin(chatId, userId);
    if (!userAdmin) {
      await deleteMessage(chatId, triggerInfo.params.messageId);
      return { success: true, message: "Stickers not allowed" };
    }
  }
  
  if (settings?.gif_limit && mediaType === "animation") {
    const userAdmin = await isAdmin(chatId, userId);
    if (!userAdmin) {
      await deleteMessage(chatId, triggerInfo.params.messageId);
      return { success: true, message: "GIFs not allowed" };
    }
  }
  
  if (settings?.voice_limit && mediaType === "voice") {
    const userAdmin = await isAdmin(chatId, userId);
    if (!userAdmin) {
      await deleteMessage(chatId, triggerInfo.params.messageId);
      return { success: true, message: "Voice not allowed" };
    }
  }
  
  if (settings?.forward_limit && isForwarded) {
    const userAdmin = await isAdmin(chatId, userId);
    if (!userAdmin) {
      await deleteMessage(chatId, triggerInfo.params.messageId);
      return { success: true, message: "Forwards not allowed" };
    }
  }
  
  if (mentionedUsers.length > 0) {
    const afkUsers = await db.getAfkUsers(chatId, mentionedUsers.map(u => u.id));
    for (const afkUser of afkUsers) {
      const since = afkUser.afk_since ? new Date(afkUser.afk_since) : new Date();
      const diff = Math.floor((Date.now() - since.getTime()) / 60000);
      await sendTelegramMessage(
        chatId,
        `💤 ${afkUser.first_name || afkUser.username} отошёл ${diff} мин. назад${afkUser.afk_reason ? `: ${afkUser.afk_reason}` : ""}`
      );
    }
  }
  
  const user = await db.getUser(userId, chatId);
  if (user?.is_afk) {
    await db.removeAfk(userId, chatId);
    await sendTelegramMessage(chatId, `👋 С возвращением, ${firstName}!`);
  }
  
  const newLevel = await db.levelUp(userId, chatId);
  if (newLevel) {
    await sendTelegramMessage(chatId, `🎉 ${firstName} достиг уровня ${newLevel}!`);
  }
  
  return { success: true, message: "Message processed" };
}

async function cmdStart(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  const keyboard = {
    inline_keyboard: [
      [
        { text: "💰 Донат", callback_data: "menu:donate" },
        { text: "📜 Команды", callback_data: "menu:commands" }
      ],
      [
        { text: "🎨 Троллинг консоль", callback_data: "menu:premium" },
        { text: "👑 Владелец", callback_data: "menu:owner" }
      ]
    ]
  };
  
  await sendTelegramMessage(chatId, `Привет, ${firstName}! 👋\n\nЯ многофункциональный бот. Все команды можно писать на русском языке!\n\nИспользуй кнопки ниже для навигации:`, keyboard);
  return { success: true, message: "Start sent" };
}

async function cmdHelp(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const text = `📚 <b>Полный список команд бота</b>

👤 <b>Профиль (3 команды)</b>
/profile - инфо профиля
/balance (или /stars) - баланс звёзд
/id - ваш ID

💰 <b>Экономика (5 команд)</b>
/daily - ежедневная награда ⭐
/weekly - еженедельная награда ⭐
/pay @юзер - отправить звёзды
/top_rich - топ богачей
/virtas - показать виртов

🎮 <b>Игры и казино (6 команд)</b>
/roll - кубик 🎲
/dice - монета 🪙
/slots - слоты 🎰
/casino - казино 🎰
/fish - рыбалка 🎣
/duel @юзер - дуэль ⚔️

💍 <b>Брачная система (3 команды)</b>
/marry @юзер - предложение 💍
/accept_marry - принять 💕
/divorce - развод 😢

💎 <b>Троллинг консоль - Премиум (200⭐)</b>
/smeshnoy_text - смешные фразы (6ч КД)
/kloun - статус клоуна (6ч КД)
/unmuteall - размут везде ✅
/invisibility - невидимость
/transform или превратить - трансформация

⚔️ <b>RP: Боевые (текстовой команды)</b>
ударить, убить, выстрелить, зарезать, отравить, взорвать, сжечь, задушить, толкнуть, пнуть, связать, арестовать, обезглавить, расстрелять

❤️ <b>RP: Позитивные</b>
обнять, целовать, погладить, улыбнуться, подмигнуть, пожать, утешить, похвалить, танец, комплимент, ужин, цветы, серенада

😊 <b>RP: Эмоции</b>
смеяться, плакать, вздохнуть, нахмуриться, удивиться, испугаться, разозлиться, восхититься, усмехнуться

🏃 <b>RP: Физические</b>
бежать, спрятаться, замереть, присесть, лечь, встать, прыгнуть, нырнуть, кивнуть

🔮 <b>RP: Магия</b>
заморозить, поджечь, ослепить, молния, проклятие, снять, исцелить, воскресить

🌟 <b>Команда дня</b>
кто сегодня [текст] - предсказание 🎰

🛡️ <b>Модерация (админам)</b>
/ban, /mute, /warn, /kick, /restrict
бан, разбан, мут, размут, кик, варн (можно без /)

⚙️ <b>Настройки чата (админам)</b>
/set_welcome, /set_rules, /media_limit, /links

👑 <b>Команды владельца</b>
/addcoins - пополнить баланс до 9,999,999⭐`;

  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Help sent" };
}

async function cmdBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя (ответом на сообщение или упоминанием).");
    return { success: false, message: "No target" };
  }
  
  const reason = args.join(" ") || "Не указана";
  await banChatMember(chatId, target.userId);
  await sendTelegramMessage(chatId, `🚫 <b>${target.firstName}</b> забанен.\nПричина: ${reason}`);
  return { success: true, message: "User banned" };
}

async function cmdSoftBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const reason = args.join(" ") || "Не указана";
  await banChatMember(chatId, target.userId);
  await unbanChatMember(chatId, target.userId, true);
  await sendTelegramMessage(chatId, `🚫 <b>${target.firstName}</b> получил софт-бан (удалён с сообщениями).\nПричина: ${reason}`);
  return { success: true, message: "User softbanned" };
}

async function cmdTempBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const duration = parseTime(args[0] || "1h");
  if (!duration) {
    await sendTelegramMessage(chatId, "❌ Неверный формат времени. Пример: 1h, 30m, 1d");
    return { success: false, message: "Invalid time" };
  }
  
  const reason = args.slice(1).join(" ") || "Не указана";
  const untilDate = Math.floor(Date.now() / 1000) + duration;
  
  await banChatMember(chatId, target.userId, untilDate);
  await db.addTempRestriction(target.userId, chatId, "ban", userId, new Date(untilDate * 1000), reason);
  await sendTelegramMessage(chatId, `⏰ <b>${target.firstName}</b> забанен на ${formatDuration(duration)}.\nПричина: ${reason}`);
  return { success: true, message: "User temp banned" };
}

async function cmdUnban(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await unbanChatMember(chatId, target.userId, true);
  await db.removeTempRestriction(target.userId, chatId, "ban");
  await sendTelegramMessage(chatId, `✅ <b>${target.firstName}</b> разбанен.`);
  return { success: true, message: "User unbanned" };
}

async function cmdMute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  // Проверка иммунитета (4 минуты после /unmuteall)
  const immunityRes = await db.query("SELECT expires_at FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = 'immunity'", [target.userId, chatId]);
  if (immunityRes.rows.length > 0 && new Date(immunityRes.rows[0].expires_at) > new Date()) {
    await sendTelegramMessage(chatId, `🛡️ У пользователя <b>${target.firstName}</b> временный иммунитет от мутов!`);
    return { success: false, message: "User has immunity" };
  }
  
  const duration = parseTime(args[0] || "1h");
  const reason = args.slice(duration ? 1 : 0).join(" ") || "Не указана";
  const untilDate = duration ? Math.floor(Date.now() / 1000) + duration : undefined;
  
  await restrictChatMember(chatId, target.userId, { can_send_messages: false }, untilDate);
  if (duration) {
    await db.addTempRestriction(target.userId, chatId, "mute", userId, new Date((untilDate || 0) * 1000), reason);
  }
  
  const timeText = duration ? ` на ${formatDuration(duration)}` : "";
  await sendTelegramMessage(chatId, `🔇 <b>${target.firstName}</b> замучен${timeText}.\nПричина: ${reason}`);
  return { success: true, message: "User muted" };
}

async function cmdTempMute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  return await cmdMute(triggerInfo, args, isAdmin, logger);
}

async function cmdUnmute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await restrictChatMember(chatId, target.userId, {
    can_send_messages: true,
    can_send_media_messages: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
  });
  await db.removeTempRestriction(target.userId, chatId, "mute");
  await sendTelegramMessage(chatId, `🔊 <b>${target.firstName}</b> размучен.`);
  return { success: true, message: "User unmuted" };
}

async function cmdReadOnly(triggerInfo: TriggerInfoTelegram, enable: boolean, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  await db.updateChatSettings(chatId, { read_only: enable });
  const msg = enable ? "📖 Включён режим только для чтения." : "📝 Режим только для чтения отключён.";
  await sendTelegramMessage(chatId, msg);
  return { success: true, message: enable ? "Read-only enabled" : "Read-only disabled" };
}

async function cmdWarn(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const reason = args.join(" ") || "Не указана";
  const warnCount = await db.addWarning(target.userId, chatId, userId, reason);
  const chatSettings = await db.getChatSettings(chatId);
  const warnLimit = chatSettings?.warn_limit || 3;
  
  if (warnCount >= warnLimit) {
    await banChatMember(chatId, target.userId);
    await sendTelegramMessage(chatId, `⚠️ <b>${target.firstName}</b> получил ${warnCount}/${warnLimit} предупреждений и был забанен.\nПричина: ${reason}`);
  } else {
    await sendTelegramMessage(chatId, `⚠️ <b>${target.firstName}</b> получил предупреждение (${warnCount}/${warnLimit}).\nПричина: ${reason}`);
  }
  return { success: true, message: "User warned" };
}

async function cmdUnwarn(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const removed = await db.removeWarning(target.userId, chatId);
  if (removed) {
    const count = await db.getWarningCount(target.userId, chatId);
    await sendTelegramMessage(chatId, `✅ Снято предупреждение с <b>${target.firstName}</b>. Осталось: ${count}`);
  } else {
    await sendTelegramMessage(chatId, `❌ У <b>${target.firstName}</b> нет предупреждений.`);
  }
  return { success: true, message: "Warning removed" };
}

async function cmdWarns(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  const targetId = target?.userId || userId;
  const targetName = target?.firstName || firstName;
  
  const warnings = await db.getWarnings(targetId, chatId);
  if (warnings.length === 0) {
    await sendTelegramMessage(chatId, `✅ У <b>${targetName}</b> нет предупреждений.`);
  } else {
    let text = `⚠️ <b>Предупреждения ${targetName}</b> (${warnings.length}):\n\n`;
    warnings.forEach((w: any, i: number) => {
      const date = new Date(w.created_at).toLocaleDateString("ru-RU");
      text += `${i + 1}. ${w.reason || "Без причины"} (${date})\n`;
    });
    await sendTelegramMessage(chatId, text);
  }
  return { success: true, message: "Warnings shown" };
}

async function cmdResetWarns(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await db.resetWarnings(target.userId, chatId);
  await sendTelegramMessage(chatId, `✅ Все предупреждения <b>${target.firstName}</b> сброшены.`);
  return { success: true, message: "Warnings reset" };
}

async function cmdWarnLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const limit = parseInt(args[0]);
  if (isNaN(limit) || limit < 1 || limit > 10) {
    await sendTelegramMessage(chatId, "❌ Укажите число от 1 до 10.");
    return { success: false, message: "Invalid limit" };
  }
  
  await db.updateChatSettings(chatId, { warn_limit: limit });
  await sendTelegramMessage(chatId, `✅ Лимит предупреждений установлен: ${limit}`);
  return { success: true, message: "Warn limit set" };
}

async function cmdKick(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const reason = args.join(" ") || "Не указана";
  await banChatMember(chatId, target.userId);
  await unbanChatMember(chatId, target.userId, true);
  await sendTelegramMessage(chatId, `👢 <b>${target.firstName}</b> кикнут.\nПричина: ${reason}`);
  return { success: true, message: "User kicked" };
}

async function cmdKickMe(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  await banChatMember(chatId, userId);
  await unbanChatMember(chatId, userId, true);
  await sendTelegramMessage(chatId, `👋 ${firstName} покинул чат.`);
  return { success: true, message: "User kicked self" };
}

async function cmdRestrict(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await restrictChatMember(chatId, target.userId, {
    can_send_messages: true,
    can_send_media_messages: false,
    can_send_other_messages: false,
    can_add_web_page_previews: false,
  });
  await sendTelegramMessage(chatId, `🔒 Права <b>${target.firstName}</b> ограничены.`);
  return { success: true, message: "User restricted" };
}

async function cmdUnrestrict(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await restrictChatMember(chatId, target.userId, {
    can_send_messages: true,
    can_send_media_messages: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
  });
  await sendTelegramMessage(chatId, `🔓 Ограничения <b>${target.firstName}</b> сняты.`);
  return { success: true, message: "User unrestricted" };
}

async function cmdAntispam(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { antispam_enabled: enable });
  await sendTelegramMessage(chatId, enable ? "🛡 Антиспам включён." : "🛡 Антиспам отключён.");
  return { success: true, message: "Antispam toggled" };
}

async function cmdFlood(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const limit = parseInt(args[0]);
  if (isNaN(limit) || limit < 1 || limit > 100) {
    await sendTelegramMessage(chatId, "❌ Укажите число от 1 до 100.");
    return { success: false, message: "Invalid limit" };
  }
  
  await db.updateChatSettings(chatId, { flood_limit: limit });
  await sendTelegramMessage(chatId, `✅ Лимит флуда: ${limit} сообщений/мин`);
  return { success: true, message: "Flood limit set" };
}

async function cmdBlacklist(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const word = args.join(" ");
  if (!word) {
    await sendTelegramMessage(chatId, "❌ Укажите слово для добавления в чёрный список.");
    return { success: false, message: "No word" };
  }
  
  await db.addBlacklistWord(chatId, word, userId);
  await sendTelegramMessage(chatId, `✅ Слово "${word}" добавлено в чёрный список.`);
  return { success: true, message: "Word blacklisted" };
}

async function cmdWhitelist(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const word = args.join(" ");
  if (!word) {
    await sendTelegramMessage(chatId, "❌ Укажите слово для удаления из чёрного списка.");
    return { success: false, message: "No word" };
  }
  
  await db.removeBlacklistWord(chatId, word);
  await sendTelegramMessage(chatId, `✅ Слово "${word}" удалено из чёрного списка.`);
  return { success: true, message: "Word whitelisted" };
}

async function cmdCaps(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  if (args[0]?.toLowerCase() === "off") {
    await db.updateChatSettings(chatId, { caps_limit: 0 });
    await sendTelegramMessage(chatId, "✅ Ограничение заглавных букв отключено.");
  } else {
    const limit = parseInt(args[0]) || 70;
    await db.updateChatSettings(chatId, { caps_limit: limit });
    await sendTelegramMessage(chatId, `✅ Лимит заглавных букв: ${limit}%`);
  }
  return { success: true, message: "Caps limit set" };
}

async function cmdLinks(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const allow = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { links_allowed: allow });
  await sendTelegramMessage(chatId, allow ? "🔗 Ссылки разрешены." : "🔗 Ссылки запрещены.");
  return { success: true, message: "Links toggled" };
}

async function cmdBadwords(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const words = await db.getBlacklistWords(chatId);
  
  if (words.length === 0) {
    await sendTelegramMessage(chatId, "📝 Чёрный список слов пуст.");
  } else {
    await sendTelegramMessage(chatId, `📝 <b>Чёрный список:</b>\n${words.join(", ")}`);
  }
  return { success: true, message: "Badwords shown" };
}

async function cmdInfo(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName, userName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  const targetId = target?.userId || userId;
  const targetName = target?.firstName || firstName;
  const targetUsername = target?.username || userName;
  
  const user = await db.getUser(targetId, chatId);
  const warnCount = await db.getWarningCount(targetId, chatId);
  
  const text = `👤 <b>Информация о ${targetName}</b>

🆔 ID: <code>${targetId}</code>
📛 Имя: ${targetName}
${targetUsername ? `👤 Username: @${targetUsername}` : ""}
⭐ Звёзды: ${user?.stars || 0}
🏆 Репутация: ${user?.reputation || 0}
📊 Уровень: ${user?.level || 1}
💬 Сообщений: ${user?.message_count || 0}
⚠️ Предупреждений: ${warnCount}
${user?.prefix ? `🏷 Префикс: ${user.prefix}` : ""}
${user?.is_premium ? "💎 Премиум: Да" : ""}`;

  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Info shown" };
}

async function cmdId(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `🆔 Ваш ID: <code>${userId}</code>\n💬 ID чата: <code>${chatId}</code>`);
  return { success: true, message: "ID shown" };
}

async function cmdWhois(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdInfo(triggerInfo, logger);
}

async function cmdProfile(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName, userName } = triggerInfo.params;
  
  const user = await db.getUser(userId, chatId);
  const warnCount = await db.getWarningCount(userId, chatId);
  const isPremium = await db.isPremium(userId);
  
  const text = `👤 <b>Профиль ${firstName}</b>

🆔 ID: <code>${userId}</code>
${userName ? `📛 Username: @${userName}` : ""}
⭐ Звёзды: ${user?.stars || 0}
🏆 Репутация: ${user?.reputation || 0}
📊 Уровень: ${user?.level || 1} (XP: ${user?.xp || 0})
💬 Сообщений: ${user?.message_count || 0}
⚠️ Предупреждений: ${warnCount}
${user?.prefix ? `🏷 Префикс: ${user.prefix}` : ""}
${user?.bio ? `📝 Био: ${user.bio}` : ""}
${isPremium || user?.is_premium ? "💎 Статус: Премиум" : ""}
${user?.is_married_to ? `💑 Женат/замужем` : ""}`;

  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Profile shown" };
}

async function cmdUsers(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const stats = await db.getChatStats(chatId);
  await sendTelegramMessage(chatId, `👥 Пользователей в базе: ${stats.userCount}`);
  return { success: true, message: "Users count shown" };
}

async function cmdAdmins(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const admins = await getChatAdministrators(chatId);
  
  if (!admins.ok) {
    await sendTelegramMessage(chatId, "❌ Не удалось получить список админов.");
    return { success: false, message: "Failed to get admins" };
  }
  
  let text = "👑 <b>Администраторы:</b>\n\n";
  admins.result.forEach((admin: any) => {
    const status = admin.status === "creator" ? "👑 Создатель" : "⭐ Админ";
    text += `${status}: ${admin.user.first_name}${admin.user.username ? ` (@${admin.user.username})` : ""}\n`;
  });
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Admins shown" };
}

async function cmdMods(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdAdmins(triggerInfo, logger);
}

async function cmdChatInfo(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  
  const chat = await getChat(chatId);
  const count = await getChatMembersCount(chatId);
  const stats = await db.getChatStats(chatId);
  const settings = await db.getChatSettings(chatId);
  
  const text = `💬 <b>Информация о чате</b>

📛 Название: ${chat.result?.title || "Личный чат"}
🆔 ID: <code>${chatId}</code>
👥 Участников: ${count.result || 0}
💬 Всего сообщений: ${stats.messageCount}
⚠️ Всего предупреждений: ${stats.warnCount}

⚙️ <b>Настройки:</b>
• Антиспам: ${settings?.antispam_enabled ? "✅" : "❌"}
• Приветствие: ${settings?.welcome_enabled ? "✅" : "❌"}
• Ссылки: ${settings?.links_allowed ? "✅" : "❌"}
• Лимит варнов: ${settings?.warn_limit || 3}`;

  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Chat info shown" };
}

async function cmdStats(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdChatInfo(triggerInfo, logger);
}

async function cmdTopActivity(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const top = await db.getTopActive(chatId, 10);
  
  if (top.length === 0) {
    await sendTelegramMessage(chatId, "📊 Статистика пуста.");
    return { success: true, message: "No stats" };
  }
  
  let text = "🏆 <b>Топ активных:</b>\n\n";
  top.forEach((user: any, i: number) => {
    const medal = i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`;
    text += `${medal} ${user.first_name || user.username}: ${user.message_count} сообщ.\n`;
  });
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Top shown" };
}

async function cmdTopWarns(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const top = await db.getTopWarns(chatId, 10);
  
  if (top.length === 0) {
    await sendTelegramMessage(chatId, "⚠️ Никто не получал предупреждений.");
    return { success: true, message: "No warns" };
  }
  
  let text = "⚠️ <b>Топ по предупреждениям:</b>\n\n";
  top.forEach((user: any, i: number) => {
    text += `${i + 1}. ${user.first_name || user.username || user.user_id}: ${user.warn_count} варн(ов)\n`;
  });
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Top warns shown" };
}

async function cmdMyStats(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdProfile(triggerInfo, logger);
}

async function cmdUserCount(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const count = await getChatMembersCount(chatId);
  await sendTelegramMessage(chatId, `👥 Участников в чате: ${count.result || 0}`);
  return { success: true, message: "User count shown" };
}

async function cmdMessageCount(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const stats = await db.getChatStats(chatId);
  await sendTelegramMessage(chatId, `💬 Всего сообщений: ${stats.messageCount}`);
  return { success: true, message: "Message count shown" };
}

async function cmdRank(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  const targetId = target?.userId || userId;
  const targetName = target?.firstName || firstName;
  
  const user = await db.getUser(targetId, chatId);
  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const xpNeeded = level * 100;
  
  const ranks = ["Новичок", "Активист", "Ветеран", "Мастер", "Легенда", "Божество"];
  const rankIndex = Math.min(Math.floor(level / 5), ranks.length - 1);
  
  await sendTelegramMessage(chatId, `🏅 <b>${targetName}</b>\nРанг: ${ranks[rankIndex]}\nУровень: ${level}\nXP: ${xp}/${xpNeeded}`);
  return { success: true, message: "Rank shown" };
}

async function cmdLevel(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdRank(triggerInfo, logger);
}

async function cmdLeaderboard(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdTopActivity(triggerInfo, logger);
}

async function cmdReputation(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  const targetId = target?.userId || userId;
  const targetName = target?.firstName || firstName;
  
  const rep = await db.getReputation(targetId, chatId);
  await sendTelegramMessage(chatId, `🏆 Репутация <b>${targetName}</b>: ${rep}`);
  return { success: true, message: "Reputation shown" };
}

async function cmdRepTop(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const top = await db.getTopReputation(chatId, 10);
  
  if (top.length === 0) {
    await sendTelegramMessage(chatId, "🏆 Рейтинг репутации пуст.");
    return { success: true, message: "No reputation" };
  }
  
  let text = "🏆 <b>Топ по репутации:</b>\n\n";
  top.forEach((user: any, i: number) => {
    const medal = i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`;
    text += `${medal} ${user.first_name || user.username}: ${user.reputation}\n`;
  });
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Rep top shown" };
}

async function cmdAward(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const points = parseInt(args[0]) || 10;
  await db.updateReputation(target.userId, chatId, userId, points, "Награда от админа");
  await sendTelegramMessage(chatId, `🎖 <b>${target.firstName}</b> получил +${points} репутации!`);
  return { success: true, message: "User awarded" };
}

async function cmdSetWelcome(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const text = args.join(" ");
  if (!text) {
    await sendTelegramMessage(chatId, "❌ Укажите текст приветствия. Используйте {username} для имени.");
    return { success: false, message: "No text" };
  }
  
  await db.updateChatSettings(chatId, { welcome_message: text });
  await sendTelegramMessage(chatId, `✅ Приветствие установлено:\n${text}`);
  return { success: true, message: "Welcome set" };
}

async function cmdSetRules(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const text = args.join(" ");
  if (!text) {
    await sendTelegramMessage(chatId, "❌ Укажите правила чата.");
    return { success: false, message: "No text" };
  }
  
  await db.updateChatSettings(chatId, { rules: text });
  await sendTelegramMessage(chatId, `✅ Правила установлены.`);
  return { success: true, message: "Rules set" };
}

async function cmdRules(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const settings = await db.getChatSettings(chatId);
  
  if (!settings?.rules) {
    await sendTelegramMessage(chatId, "📜 Правила не установлены.");
  } else {
    await sendTelegramMessage(chatId, `📜 <b>Правила чата:</b>\n\n${settings.rules}`);
  }
  return { success: true, message: "Rules shown" };
}

async function cmdSetGoodbye(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const text = args.join(" ");
  if (!text) {
    await sendTelegramMessage(chatId, "❌ Укажите текст прощания.");
    return { success: false, message: "No text" };
  }
  
  await db.updateChatSettings(chatId, { goodbye_message: text, goodbye_enabled: true });
  await sendTelegramMessage(chatId, `✅ Прощание установлено:\n${text}`);
  return { success: true, message: "Goodbye set" };
}

async function cmdWelcomeToggle(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { welcome_enabled: enable });
  await sendTelegramMessage(chatId, enable ? "👋 Приветствия включены." : "👋 Приветствия отключены.");
  return { success: true, message: "Welcome toggled" };
}

async function cmdSetLang(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const lang = args[0] || "ru";
  await db.updateChatSettings(chatId, { language: lang });
  await sendTelegramMessage(chatId, `🌐 Язык установлен: ${lang}`);
  return { success: true, message: "Language set" };
}

async function cmdLogChannel(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  await sendTelegramMessage(chatId, "📝 Функция логирования в разработке.");
  return { success: true, message: "Log channel - WIP" };
}

async function cmdReportChannel(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  await sendTelegramMessage(chatId, "📝 Функция канала жалоб в разработке.");
  return { success: true, message: "Report channel - WIP" };
}

async function cmdAutoDelete(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const time = parseInt(args[0]) || 0;
  await db.updateChatSettings(chatId, { auto_delete_time: time });
  await sendTelegramMessage(chatId, time > 0 ? `🗑 Автоудаление: ${time} сек.` : "🗑 Автоудаление отключено.");
  return { success: true, message: "Auto delete set" };
}

async function cmdCleanService(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { clean_service: enable });
  await sendTelegramMessage(chatId, enable ? "🧹 Удаление сервисных сообщений включено." : "🧹 Удаление сервисных сообщений отключено.");
  return { success: true, message: "Clean service toggled" };
}

async function cmdMediaLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { media_limit: enable });
  await sendTelegramMessage(chatId, enable ? "🖼 Медиа ограничены." : "🖼 Ограничения медиа сняты.");
  return { success: true, message: "Media limit toggled" };
}

async function cmdStickerLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { sticker_limit: enable });
  await sendTelegramMessage(chatId, enable ? "🎭 Стикеры ограничены." : "🎭 Ограничения стикеров сняты.");
  return { success: true, message: "Sticker limit toggled" };
}

async function cmdGifLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { gif_limit: enable });
  await sendTelegramMessage(chatId, enable ? "🎬 GIF ограничены." : "🎬 Ограничения GIF сняты.");
  return { success: true, message: "GIF limit toggled" };
}

async function cmdVoiceLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { voice_limit: enable });
  await sendTelegramMessage(chatId, enable ? "🎤 Голосовые ограничены." : "🎤 Ограничения голосовых сняты.");
  return { success: true, message: "Voice limit toggled" };
}

async function cmdForwardLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const enable = args[0]?.toLowerCase() !== "off";
  await db.updateChatSettings(chatId, { forward_limit: enable });
  await sendTelegramMessage(chatId, enable ? "↩️ Пересылки ограничены." : "↩️ Ограничения пересылок сняты.");
  return { success: true, message: "Forward limit toggled" };
}

async function cmdReport(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя (ответом на сообщение).");
    return { success: false, message: "No target" };
  }
  
  const reason = args.join(" ") || "Не указана";
  await db.addReport(userId, target.userId, chatId, reason);
  await sendTelegramMessage(chatId, `📢 Жалоба на <b>${target.firstName}</b> отправлена.\nПричина: ${reason}`);
  return { success: true, message: "Report sent" };
}

async function cmdCompliment(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const compliment = compliments[Math.floor(Math.random() * compliments.length)];
  await sendTelegramMessage(chatId, `💝 <b>${firstName}</b> говорит <b>${target.firstName}</b>:\n${compliment}`);
  return { success: true, message: "Compliment sent" };
}

async function cmdThank(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await sendTelegramMessage(chatId, `🙏 <b>${firstName}</b> благодарит <b>${target.firstName}</b>! Спасибо! 💖`);
  return { success: true, message: "Thanks sent" };
}

async function cmdRep(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  if (target.userId === userId) {
    await sendTelegramMessage(chatId, "❌ Нельзя повысить репутацию самому себе!");
    return { success: false, message: "Self rep" };
  }
  
  const canGive = await db.canGiveReputation(userId, target.userId, chatId);
  if (!canGive) {
    await sendTelegramMessage(chatId, "⏳ Вы уже повышали репутацию этому пользователю сегодня.");
    return { success: false, message: "Already gave rep" };
  }
  
  await db.updateReputation(target.userId, chatId, userId, 1, "От пользователя");
  const newRep = await db.getReputation(target.userId, chatId);
  await sendTelegramMessage(chatId, `⬆️ <b>${firstName}</b> повысил репутацию <b>${target.firstName}</b>!\nТекущая репутация: ${newRep}`);
  return { success: true, message: "Rep given" };
}

async function cmdMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  if (target.userId === userId) {
    await sendTelegramMessage(chatId, "❌ Нельзя жениться на себе!");
    return { success: false, message: "Self marry" };
  }
  
  const user = await db.getUser(userId, chatId);
  if (user?.is_married_to) {
    await sendTelegramMessage(chatId, "💔 Вы уже женаты/замужем!");
    return { success: false, message: "Already married" };
  }
  
  const targetUser = await db.getUser(target.userId, chatId);
  if (targetUser?.is_married_to) {
    await sendTelegramMessage(chatId, `💔 ${target.firstName} уже женат/замужем!`);
    return { success: false, message: "Target married" };
  }
  
  await db.setMarried(userId, target.userId, chatId);
  await sendTelegramMessage(chatId, `💍 <b>${firstName}</b> и <b>${target.firstName}</b> теперь женаты! 🎉💕`);
  return { success: true, message: "Married" };
}

async function cmdBio(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const bio = args.join(" ");
  if (!bio) {
    await sendTelegramMessage(chatId, "❌ Укажите текст для био.");
    return { success: false, message: "No bio" };
  }
  
  if (bio.length > 200) {
    await sendTelegramMessage(chatId, "❌ Био не должно превышать 200 символов.");
    return { success: false, message: "Bio too long" };
  }
  
  await db.updateUserBio(userId, chatId, bio);
  await sendTelegramMessage(chatId, `✅ Ваше био обновлено: ${bio}`);
  return { success: true, message: "Bio set" };
}

async function cmdAfk(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const reason = args.join(" ") || undefined;
  await db.setAfk(userId, chatId, reason);
  await sendTelegramMessage(chatId, `💤 ${firstName} отошёл${reason ? `: ${reason}` : ""}`);
  return { success: true, message: "AFK set" };
}

async function cmdBack(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const user = await db.getUser(userId, chatId);
  if (!user?.is_afk) {
    await sendTelegramMessage(chatId, "❓ Вы не были в AFK режиме.");
    return { success: false, message: "Not AFK" };
  }
  
  await db.removeAfk(userId, chatId);
  const since = user.afk_since ? new Date(user.afk_since) : new Date();
  const diff = Math.floor((Date.now() - since.getTime()) / 60000);
  await sendTelegramMessage(chatId, `👋 ${firstName} вернулся! (был AFK ${diff} мин.)`);
  return { success: true, message: "Back from AFK" };
}

async function cmdBonus(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  await db.getOrCreateUser(userId, chatId);
  const result = await db.claimDailyBonus(userId, chatId);
  
  if (result.success) {
    await sendTelegramMessage(chatId, `🎁 ${firstName}, ${result.message}`);
  } else {
    await sendTelegramMessage(chatId, `⏳ ${firstName}, ${result.message}`);
  }
  return { success: result.success, message: result.message };
}

async function cmdKarma(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdReputation(triggerInfo, logger);
}

async function cmdGift(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const gifts = ["🎁", "🎀", "💝", "🌹", "🍫", "🧸", "💎", "🌟"];
  const gift = gifts[Math.floor(Math.random() * gifts.length)];
  
  await sendTelegramMessage(chatId, `${gift} <b>${firstName}</b> дарит подарок <b>${target.firstName}</b>! ${gift}`);
  return { success: true, message: "Gift sent" };
}

async function cmdHug(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await sendTelegramMessage(chatId, `🤗 <b>${firstName}</b> обнимает <b>${target.firstName}</b>! 💕`);
  return { success: true, message: "Hug sent" };
}

async function cmdCoin(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const result = Math.random() < 0.5 ? "🪙 Орёл!" : "🪙 Решка!";
  await sendTelegramMessage(chatId, result);
  return { success: true, message: "Coin flipped" };
}

async function cmdRandom(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  const max = parseInt(args[0]) || 100;
  const result = Math.floor(Math.random() * max) + 1;
  await sendTelegramMessage(chatId, `🎲 Случайное число (1-${max}): <b>${result}</b>`);
  return { success: true, message: "Random generated" };
}

async function cmdDice(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const result = Math.floor(Math.random() * 6) + 1;
  const dice = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  await sendTelegramMessage(chatId, `🎲 Вы выбросили: ${dice[result - 1]} (${result})`);
  return { success: true, message: "Dice rolled" };
}

async function cmdCasino(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const bet = parseInt(args[0]) || 10;
  const user = await db.getUser(userId, chatId);
  
  if (!user || user.stars < bet) {
    await sendTelegramMessage(chatId, `❌ Недостаточно звёзд! У вас: ${user?.stars || 0} ⭐`);
    return { success: false, message: "Not enough stars" };
  }
  
  const win = Math.random() < 0.45;
  const multiplier = Math.random() < 0.1 ? 3 : 2;
  const amount = win ? bet * multiplier : -bet;
  
  await db.updateUserStars(userId, chatId, amount, win ? "Выигрыш в казино" : "Проигрыш в казино");
  
  if (win) {
    await sendTelegramMessage(chatId, `🎰 ${firstName} выиграл ${bet * multiplier} ⭐! 🎉`);
  } else {
    await sendTelegramMessage(chatId, `🎰 ${firstName} проиграл ${bet} ⭐ 😢`);
  }
  return { success: true, message: "Casino played" };
}

async function cmdSlot(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const bet = parseInt(args[0]) || 10;
  const user = await db.getUser(userId, chatId);
  
  if (!user || user.stars < bet) {
    await sendTelegramMessage(chatId, `❌ Недостаточно звёзд! У вас: ${user?.stars || 0} ⭐`);
    return { success: false, message: "Not enough stars" };
  }
  
  const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];
  const s1 = symbols[Math.floor(Math.random() * symbols.length)];
  const s2 = symbols[Math.floor(Math.random() * symbols.length)];
  const s3 = symbols[Math.floor(Math.random() * symbols.length)];
  
  let winAmount = 0;
  if (s1 === s2 && s2 === s3) {
    winAmount = bet * 10;
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    winAmount = bet * 2;
  }
  
  const netAmount = winAmount > 0 ? winAmount - bet : -bet;
  await db.updateUserStars(userId, chatId, netAmount, winAmount > 0 ? "Выигрыш в слотах" : "Проигрыш в слотах");
  
  let text = `🎰 | ${s1} | ${s2} | ${s3} |\n\n`;
  if (winAmount > 0) {
    text += `🎉 ${firstName} выиграл ${winAmount} ⭐!`;
  } else {
    text += `😢 ${firstName} проиграл ${bet} ⭐`;
  }
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Slot played" };
}

async function cmdGuess(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  
  const guess = parseInt(args[0]);
  if (isNaN(guess) || guess < 1 || guess > 10) {
    await sendTelegramMessage(chatId, "🎯 Угадай число от 1 до 10! Используй: /guess [число]");
    return { success: true, message: "Guess info" };
  }
  
  const secret = Math.floor(Math.random() * 10) + 1;
  if (guess === secret) {
    await sendTelegramMessage(chatId, `🎉 Правильно! Загаданное число: ${secret}`);
  } else {
    await sendTelegramMessage(chatId, `❌ Неверно! Загаданное число: ${secret}`);
  }
  return { success: true, message: "Guess played" };
}

async function cmdQuiz(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  
  const quizzes = [
    { q: "Столица Франции?", a: "Париж" },
    { q: "Сколько планет в Солнечной системе?", a: "8" },
    { q: "Какой химический символ у золота?", a: "Au" },
    { q: "В каком году началась Вторая мировая война?", a: "1939" },
    { q: "Самая большая страна в мире?", a: "Россия" },
  ];
  
  const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
  await sendTelegramMessage(chatId, `❓ <b>Викторина:</b>\n${quiz.q}\n\n<tg-spoiler>Ответ: ${quiz.a}</tg-spoiler>`);
  return { success: true, message: "Quiz sent" };
}

async function cmdTrivia(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const fact = facts[Math.floor(Math.random() * facts.length)];
  await sendTelegramMessage(chatId, `💡 <b>Интересный факт:</b>\n${fact}`);
  return { success: true, message: "Trivia sent" };
}

async function cmdTest(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "📝 Тесты в разработке! Следите за обновлениями.");
  return { success: true, message: "Test - WIP" };
}

async function cmdCompat(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const compat = Math.floor(Math.random() * 101);
  let emoji = "💔";
  if (compat > 80) emoji = "💕";
  else if (compat > 60) emoji = "💖";
  else if (compat > 40) emoji = "💗";
  else if (compat > 20) emoji = "💙";
  
  await sendTelegramMessage(chatId, `${emoji} Совместимость <b>${firstName}</b> и <b>${target.firstName}</b>: ${compat}%`);
  return { success: true, message: "Compatibility checked" };
}

async function cmdRate(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  
  const thing = args.join(" ") || "это";
  const rating = Math.floor(Math.random() * 11);
  const stars = "⭐".repeat(rating) + "☆".repeat(10 - rating);
  
  await sendTelegramMessage(chatId, `📊 Оценка "${thing}": ${rating}/10\n${stars}`);
  return { success: true, message: "Rated" };
}

async function cmdJoke(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  await sendTelegramMessage(chatId, `😄 ${joke}`);
  return { success: true, message: "Joke sent" };
}

async function cmdFact(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdTrivia(triggerInfo, logger);
}

async function cmdQuote(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  await sendTelegramMessage(chatId, `💬 ${quote}`);
  return { success: true, message: "Quote sent" };
}

async function cmdCat(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const cats = ["🐱", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];
  const cat = cats[Math.floor(Math.random() * cats.length)];
  await sendTelegramMessage(chatId, `${cat} Мяу!`);
  return { success: true, message: "Cat sent" };
}

async function cmdDog(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const dogs = ["🐶", "🐕", "🦮", "🐕‍🦺", "🐩"];
  const dog = dogs[Math.floor(Math.random() * dogs.length)];
  await sendTelegramMessage(chatId, `${dog} Гав!`);
  return { success: true, message: "Dog sent" };
}

async function cmdPromote(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await promoteChatMember(chatId, target.userId, {
    can_delete_messages: true,
    can_restrict_members: true,
    can_pin_messages: true,
  });
  await sendTelegramMessage(chatId, `👑 <b>${target.firstName}</b> назначен модератором!`);
  return { success: true, message: "User promoted" };
}

async function cmdDemote(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await promoteChatMember(chatId, target.userId, {
    can_delete_messages: false,
    can_restrict_members: false,
    can_pin_messages: false,
    can_promote_members: false,
  });
  await sendTelegramMessage(chatId, `📉 <b>${target.firstName}</b> снят с должности модератора.`);
  return { success: true, message: "User demoted" };
}

async function cmdClean(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  await sendTelegramMessage(chatId, "🧹 Функция очистки в разработке.");
  return { success: true, message: "Clean - WIP" };
}

async function cmdCleanAll(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  return await cmdClean(triggerInfo, [], isAdmin, logger);
}

async function cmdPin(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId, replyToMessage } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  if (!replyToMessage) {
    await sendTelegramMessage(chatId, "❌ Ответьте на сообщение, которое хотите закрепить.");
    return { success: false, message: "No reply" };
  }
  
  await pinChatMessage(chatId, replyToMessage.message_id);
  await sendTelegramMessage(chatId, "📌 Сообщение закреплено!");
  return { success: true, message: "Message pinned" };
}

async function cmdUnpin(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  await unpinChatMessage(chatId);
  await sendTelegramMessage(chatId, "📌 Сообщение откреплено!");
  return { success: true, message: "Message unpinned" };
}

async function cmdInvite(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  const result = await exportChatInviteLink(chatId);
  if (result.ok) {
    await sendTelegramMessage(chatId, `🔗 Ссылка-приглашение:\n${result.result}`);
  } else {
    await sendTelegramMessage(chatId, "❌ Не удалось получить ссылку.");
  }
  return { success: true, message: "Invite link sent" };
}

async function cmdBackup(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "⛔ У вас нет прав для этой команды.");
    return { success: false, message: "Not admin" };
  }
  
  await sendTelegramMessage(chatId, "💾 Резервное копирование в разработке.");
  return { success: true, message: "Backup - WIP" };
}

async function cmdBalance(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const user = await db.getUser(userId, chatId);
  await sendTelegramMessage(chatId, `⭐ ${firstName}, у вас ${user?.stars || 0} звёзд.`);
  return { success: true, message: "Balance shown" };
}

async function cmdShop(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  
  const prefixes = await db.getShopPrefixes();
  
  if (prefixes.length === 0) {
    await sendTelegramMessage(chatId, "🏪 Магазин пуст.");
    return { success: true, message: "Shop empty" };
  }
  
  let text = "🏪 <b>Магазин префиксов</b>\n\n";
  prefixes.forEach((p: any) => {
    text += `${p.display} — ${p.price} ⭐\n`;
  });
  text += "\nКупить: /buy [номер]";
  
  const buttons = prefixes.slice(0, 5).map((p: any) => ({
    text: `${p.display} (${p.price}⭐)`,
    callback_data: `buy_prefix:${p.id}`,
  }));
  
  await sendTelegramMessage(chatId, text, {
    replyMarkup: {
      inline_keyboard: [buttons],
    },
  });
  return { success: true, message: "Shop shown" };
}

async function cmdBuy(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const prefixId = parseInt(args[0]);
  if (isNaN(prefixId)) {
    await sendTelegramMessage(chatId, "❌ Укажите номер префикса. Посмотреть: /shop");
    return { success: false, message: "Invalid prefix ID" };
  }
  
  const result = await db.buyPrefix(userId, chatId, prefixId);
  await sendTelegramMessage(chatId, result.message);
  return { success: result.success, message: result.message };
}

async function cmdMyPrefixes(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const prefixes = await db.getUserPrefixes(userId);
  
  if (prefixes.length === 0) {
    await sendTelegramMessage(chatId, "🏷 У вас нет префиксов. Посмотреть магазин: /shop");
    return { success: true, message: "No prefixes" };
  }
  
  let text = "🏷 <b>Ваши префиксы:</b>\n\n";
  prefixes.forEach((p: any, i: number) => {
    text += `${i + 1}. ${p.display}\n`;
  });
  text += "\nУстановить: /setprefix [номер]";
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Prefixes shown" };
}

async function cmdSetPrefix(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  
  const prefixNum = parseInt(args[0]);
  const prefixes = await db.getUserPrefixes(userId);
  
  if (args[0] === "off" || args[0] === "none") {
    await db.setUserPrefix(userId, chatId, "");
    await sendTelegramMessage(chatId, "✅ Префикс снят.");
    return { success: true, message: "Prefix removed" };
  }
  
  if (isNaN(prefixNum) || prefixNum < 1 || prefixNum > prefixes.length) {
    await sendTelegramMessage(chatId, "❌ Неверный номер. Посмотреть: /prefixes");
    return { success: false, message: "Invalid prefix" };
  }
  
  const prefix = prefixes[prefixNum - 1];
  await db.setUserPrefix(userId, chatId, prefix.display);
  await sendTelegramMessage(chatId, `✅ Установлен префикс: ${prefix.display}`);
  return { success: true, message: "Prefix set" };
}

async function cmdBuyPremium(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const isPremium = await db.isPremium(userId);
  if (isPremium) {
    await sendTelegramMessage(chatId, `💎 У вас уже есть Троллинг консоль!`);
    return { success: true, message: "Already premium" };
  }
  
  const userStars = await db.getUserStars(userId, chatId);
  if (userStars < PREMIUM_PRICE) {
    await sendTelegramMessage(chatId, `❌ Недостаточно звёзд! Стоимость: ${PREMIUM_PRICE} ⭐. У вас: ${userStars} ⭐\n\nДля покупки свяжитесь с @${OWNER_USERNAME}`);
    return { success: false, message: "Not enough stars" };
  }
  
  await db.updateUserStars(userId, chatId, -PREMIUM_PRICE, "Покупка Троллинг консоли");
  await db.grantPremium(userId, 1);
  
  await sendTelegramMessage(chatId, `💎 ✅ <b>${firstName}</b> успешно приобрёл Троллинг консоль на месяц! Поздравляем! 🎉`);
  return { success: true, message: "Premium purchased" };
}

async function cmdGivePremium(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  
  if (!isOwner) {
    await sendTelegramMessage(chatId, "⛔ Только владелец может выдавать Троллинг консоль.");
    return { success: false, message: "Not owner" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const months = parseInt(args[0]) || 1;
  await db.grantPremium(target.userId, months);
  await sendTelegramMessage(chatId, `💎 <b>${target.firstName}</b> получил Троллинг консоль на ${months} мес.!`);
  return { success: true, message: "Premium granted" };
}

async function cmdGiveStars(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  
  if (!isOwner) {
    await sendTelegramMessage(chatId, "⛔ Только владелец может выдавать звёзды.");
    return { success: false, message: "Not owner" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  const amount = parseInt(args[0]) || 100;
  await db.updateUserStars(target.userId, chatId, amount, "Подарок от владельца");
  await sendTelegramMessage(chatId, `⭐ <b>${target.firstName}</b> получил ${amount} звёзд!`);
  return { success: true, message: "Stars given" };
}

async function cmdTransfer(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  if (target.userId === userId) {
    await sendTelegramMessage(chatId, "❌ Нельзя перевести звёзды самому себе!");
    return { success: false, message: "Self transfer" };
  }
  
  const amount = parseInt(args[0]) || 0;
  if (amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Укажите сумму для перевода.");
    return { success: false, message: "Invalid amount" };
  }
  
  const user = await db.getUser(userId, chatId);
  if (!user || user.stars < amount) {
    await sendTelegramMessage(chatId, `❌ Недостаточно звёзд! У вас: ${user?.stars || 0} ⭐`);
    return { success: false, message: "Not enough stars" };
  }
  
  await db.updateUserStars(userId, chatId, -amount, `Перевод для ${target.firstName}`);
  await db.updateUserStars(target.userId, chatId, amount, `Перевод от ${firstName}`);
  await sendTelegramMessage(chatId, `✅ ${firstName} перевёл ${amount} ⭐ пользователю ${target.firstName}!`);
  return { success: true, message: "Stars transferred" };
}

async function cmdDaily(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const result = await db.claimDailyBonus(userId, chatId);
  await sendTelegramMessage(chatId, `${result.message}${result.success ? ` 🎁 ${firstName}` : ""}`);
  return { success: result.success, message: result.message };
}

async function cmdWeekly(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const bonusAmount = 300 + Math.floor(Math.random() * 200);
  await db.updateUserStars(userId, chatId, bonusAmount, "Еженедельный бонус");
  await sendTelegramMessage(chatId, `📅 ${firstName} получил еженедельный бонус: ${bonusAmount} ⭐!`);
  return { success: true, message: "Weekly bonus claimed" };
}

async function cmdPay(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя и сумму. Пример: /pay @юзер 100");
    return { success: false, message: "No target" };
  }
  
  const amount = parseInt(args[0]) || 0;
  if (amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Укажите сумму для перевода.");
    return { success: false, message: "Invalid amount" };
  }
  
  const user = await db.getUser(userId, chatId);
  if (!user || user.stars < amount) {
    await sendTelegramMessage(chatId, `❌ Недостаточно звёзд! У вас: ${user?.stars || 0} ⭐`);
    return { success: false, message: "Not enough stars" };
  }
  
  await db.updateUserStars(userId, chatId, -amount, `Платёж для ${target.firstName}`);
  await db.updateUserStars(target.userId, chatId, amount, `Платёж от ${firstName}`);
  await sendTelegramMessage(chatId, `💰 ${firstName} отправил ${amount} ⭐ пользователю ${target.firstName}!`);
  return { success: true, message: "Payment sent" };
}

async function cmdTopRich(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const topUsers = await db.getTopActive(chatId, 10);
  const richUsers = topUsers.sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0)).slice(0, 10);
  
  if (richUsers.length === 0) {
    await sendTelegramMessage(chatId, "📊 Топ богачей пуст.");
    return { success: true, message: "Top rich empty" };
  }
  
  let text = "💰 <b>Топ богачей чата</b>\n\n";
  richUsers.forEach((u: any, i: number) => {
    text += `${i + 1}. ${u.first_name || u.username || "Аноним"} — ${u.stars || 0} ⭐\n`;
  });
  
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Top rich shown" };
}

async function cmdFish(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const todayCount = await db.getFishCountToday(userId);
  if (todayCount >= 20) {
    await sendTelegramMessage(chatId, "🎣 Вы уже исчерпали лимит рыбалки на сегодня (20/20).");
    return { success: false, message: "Fish limit reached" };
  }
  
  const fish = ["🐠", "🐟", "🐡", "🦈", "🐙", "🦑", "🦐"];
  const caughtIcon = fish[Math.floor(Math.random() * fish.length)];
  const weight = Math.floor(Math.random() * 50) + 5;
  const reward = Math.floor(weight / 2);
  
  await db.incrementFishCount(userId);
  await db.updateUserStars(userId, chatId, reward, `Рыбалка - поймал ${caughtIcon}`);
  
  await sendTelegramMessage(chatId, `🎣 ${firstName} поймал ${caughtIcon} весом ${weight}кг! Награда: ${reward} ⭐ (${todayCount + 1}/20 за сегодня)`);
  return { success: true, message: "Fish caught" };
}

async function cmdDuel(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите противника для дуэли: /duel @юзер");
    return { success: false, message: "No target" };
  }
  
  const p1Win = Math.random() > 0.5;
  const winner = p1Win ? { id: userId, name: firstName } : target;
  const reward = Math.floor(Math.random() * 50) + 10;
  
  await db.updateUserStars(winner.id, chatId, reward, "Победа в дуэли");
  await sendTelegramMessage(chatId, `⚔️ <b>${firstName}</b> вызвал <b>${target.firstName}</b> на дуэль!\n\n🏆 Победитель: <b>${winner.name}</b>! Награда: ${reward} ⭐`);
  return { success: true, message: "Duel fought" };
}

async function cmdSmeshnoyText(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isPremium = (await db.isPremium(userId)) || userId === 1314619424;
  if (!isPremium) {
    await sendTelegramMessage(chatId, "💎 Эта команда доступна только для Троллинг консоли!");
    return { success: false, message: "Not premium" };
  }
  
  const cooldownKey = `smeshnoy_cooldown_${userId}`;
  const lastUseRes = await db.query("SELECT expires_at FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = $3", [userId, chatId, cooldownKey]);
  
  if (lastUseRes.rows.length > 0 && userId !== 1314619424) {
    const expiresAt = new Date(lastUseRes.rows[0].expires_at);
    if (expiresAt > new Date()) {
      const diffMs = expiresAt.getTime() - Date.now();
      const minsLeft = Math.ceil(diffMs / (1000 * 60));
      await sendTelegramMessage(chatId, `⏳ Команда на перезарядке! Осталось ${minsLeft} мин.`);
      return { success: false, message: "On cooldown" };
    }
  }

  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя (ответом или упоминанием).");
    return { success: false, message: "No target" };
  }
  
  if (target.userId === userId && userId !== 1314619424) {
    await sendTelegramMessage(chatId, "❌ Нельзя применять эту команду на себя!");
    return { success: false, message: "Self target" };
  }
  
  const phrases = [
    "чево картошка утонула",
    "это как так-то произошло?",
    "мля, кто это вообще сделал?",
    "ахахаха, смотрите что произошло!",
    "это не может быть правдой!",
    "я сегодня проснулся не тем концом",
    "кто-нибудь видел мою совесть?",
    "кажется, я забыл как дышать",
    "почему небо такое синее, а я такой смешной?",
    "мяу, я теперь котик, покормите меня",
    "бе-бе-бе, ничего не слышу!",
    "купи слона!",
    "а я знаю ваш секретик!",
    "кто украл мою плюшку?",
    "я прилетел с Марса за вашим печеньем",
    "моя логика вышла покурить и не вернулась",
    "я профессиональный поедатель воздуха",
    "кто-то сказал 'бесплатная еда'?",
    "я — властелин дивана!",
    "улыбнитесь, вас снимает скрытая камера!",
  ];
  
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  
  // Set funny text effect in DB
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await db.query("INSERT INTO temp_restrictions (user_id, chat_id, restriction_type, admin_id, expires_at, reason) VALUES ($1, $2, 'funny_text', $3, $4, $5) ON CONFLICT (user_id, chat_id, restriction_type) DO UPDATE SET expires_at = $4, reason = $5", [target.userId, chatId, userId, expiresAt, phrase]);

  // Set cooldown
  const cooldownExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.addTempRestriction(userId, chatId, cooldownKey, userId, cooldownExpiry, "Smeshnoy Cooldown");

  await sendTelegramMessage(chatId, `😂 <b>Смешные фразы активированы для ${target.firstName}!</b>`);
  return { success: true, message: "Funny text sent" };
}
async function cmdKloun(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isPremium = (await db.isPremium(userId)) || userId === 1314619424;
  if (!isPremium) {
    await sendTelegramMessage(chatId, "💎 Эта команда доступна только для Троллинг консоли!");
    return { success: false, message: "Not premium" };
  }
  
  const cooldownKey = `kloun_cooldown_${userId}`;
  const lastUseRes = await db.query("SELECT expires_at FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = $3", [userId, chatId, cooldownKey]);
  
  if (lastUseRes.rows.length > 0 && userId !== 1314619424) {
    const expiresAt = new Date(lastUseRes.rows[0].expires_at);
    if (expiresAt > new Date()) {
      const diffMs = expiresAt.getTime() - Date.now();
      const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
      await sendTelegramMessage(chatId, `⏳ Команда на перезарядке! Осталось ${hoursLeft} ч.`);
      return { success: false, message: "On cooldown" };
    }
  }

  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  if (target.userId === userId && userId !== 1314619424) {
    await sendTelegramMessage(chatId, "❌ Нельзя применять эту команду на себя!");
    return { success: false, message: "Self target" };
  }
  
  // Set cooldown
  const cooldownExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
  await db.addTempRestriction(userId, chatId, cooldownKey, userId, cooldownExpiry, "Kloun Cooldown");

  await sendTelegramMessage(chatId, `🤡 <b>${target.firstName}</b> официально признан главным клоуном этого чата! 🎉`);
  return { success: true, message: "Clown status given" };
}

async function cmdUnmuteAll(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const isPremium = (await db.isPremium(userId)) || userId === 1314619424;
  if (!isPremium) {
    await sendTelegramMessage(chatId, "💎 Эта команда доступна только для Троллинг консоли!");
    return { success: false, message: "Not premium" };
  }
  
  const cooldownKey = `unmuteall_cooldown_${chatId}`;
  const lastUseRes = await db.query("SELECT expires_at FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = $3", [userId, chatId, cooldownKey]);
  
  if (lastUseRes.rows.length > 0 && userId !== 1314619424) {
    const expiresAt = new Date(lastUseRes.rows[0].expires_at);
    if (expiresAt > new Date()) {
      const diffMs = expiresAt.getTime() - Date.now();
      const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
      await sendTelegramMessage(chatId, `⏳ Команда на перезарядке! Осталось ${hoursLeft} ч.`);
      return { success: false, message: "On cooldown" };
    }
  }
  
  const cooldownExpiry = new Date(Date.now() + 18 * 60 * 60 * 1000);
  await db.addTempRestriction(userId, chatId, cooldownKey, userId, cooldownExpiry, "UnmuteAll Cooldown");
  
  const immunityExpiry = new Date(Date.now() + 4 * 60 * 1000);
  await db.addTempRestriction(userId, chatId, "immunity", userId, immunityExpiry, "Immunity after UnmuteAll");
  
  await sendTelegramMessage(chatId, `🔊 <b>${firstName}</b> активировал РАЗМУТ! ✅\n🛡️ Иммунитет от мутов на 4 минуты активирован для всех! (условно)`);
  return { success: true, message: "Unmute all activated" };
}

async function cmdVirtasBalance(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const virtas = await db.getUserVirtas(userId);
  await sendTelegramMessage(chatId, `💚 ${firstName}, у вас ${virtas} виртов.`);
  return { success: true, message: "Virtas shown" };
}

async function cmdBuyVirtas(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const amount = parseInt(args[0]) || 10;
  
  if (amount % 10 !== 0 || amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Сумма должна быть кратна 10 ⭐ (напр. /buyvirtas 10)");
    return { success: false, message: "Invalid amount" };
  }
  
  const result = await db.buyVirtas(userId, amount);
  await sendTelegramMessage(chatId, result.message);
  return { success: result.success, message: result.message };
}

async function cmdAddCoins(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "⛔ Только владелец может использовать эту команду.");
    return { success: false, message: "Not owner" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "No target" };
  }
  
  await db.query(
    "UPDATE bot_users SET stars = 9999999 WHERE user_id = $1 AND chat_id = $2",
    [target.userId, chatId]
  );
  await sendTelegramMessage(chatId, `💰 Баланс пользователя <b>${target.firstName}</b> установлен на 9,999,999 ⭐!`);
  return { success: true, message: "Coins added" };
}

async function cmdWhoToday(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  const text = args.join(" ") || "сегодня";
  
  const target = await db.getRandomUserFromChat(chatId);
  
  if (!target) {
    await sendTelegramMessage(chatId, "❌ В чате нет пользователей.");
    return { success: false, message: "No users found" };
  }
  
  const targetName = target.first_name || (target.username ? `@${target.username}` : `пользователь с ID:${target.user_id}`);
  
  const phrases = [
    `🔮 Ясно вижу, что <b>${targetName}</b> ${text}!`,
    `🎲 Жребий пал на <b>${targetName}</b>: именно он ${text}!`,
    `🌟 Звёзды говорят, что <b>${targetName}</b> ${text}!`,
    `📡 Радары зафиксировали, что <b>${targetName}</b> ${text}!`,
    `🎰 Джекпот! <b>${targetName}</b> ${text}!`,
  ];
  
  const answer = phrases[Math.floor(Math.random() * phrases.length)];
  await sendTelegramMessage(chatId, answer);
  return { success: true, message: "Who today answered" };
}

async function cmdAcceptMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  await sendTelegramMessage(chatId, `💍 ${firstName} согласился! Поздравляем с браком! 💕`);
  return { success: true, message: "Marriage accepted" };
}

async function cmdDivorce(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await db.divorce(userId, chatId);
  await sendTelegramMessage(chatId, `😢 Развод оформлен...`);
  return { success: true, message: "Divorced" };
}

async function cmdTransform(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const isPremium = await db.isPremium(userId);
  if (!isPremium) {
    await sendTelegramMessage(chatId, "💎 Эта команда доступна только для Троллинг консоли!");
    return { success: false, message: "Not premium" };
  }
  
  const forms = ["👽", "🤖", "🧛", "🧟", "👻", "🦇", "🐺"];
  const form = forms[Math.floor(Math.random() * forms.length)];
  await sendTelegramMessage(chatId, `✨ ${firstName} превратился в ${form}!`);
  return { success: true, message: "Transformed" };
}

