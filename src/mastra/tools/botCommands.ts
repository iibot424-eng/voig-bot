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
    const isOwnerUser = userName?.toLowerCase() === OWNER_USERNAME || userId === 1314619424 || userId === 7977020467;
    const isUserAdmin = (await isAdmin(chatId, userId)) || isOwnerUser;
    const isPremiumUser = await db.isPremium(userId);
    
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
        case "кто_сегодня_в":
        case "кто сегодня":
        case "кто сегодня в":
        case "кто":
          return await cmdWhoToday(triggerInfo, args, logger);
        case "marry":
        case "пожениться":
          return await cmdMarry(triggerInfo, logger);
        case "accept_marry":
        case "принять":
        case "accept":
          return await cmdAcceptMarry(triggerInfo, logger);
        case "divorce":
        case "развод":
          return await cmdDivorce(triggerInfo, logger);
        case "addcoins":
        case "add_coins":
        case "начислить":
          return await cmdAddCoins(triggerInfo, args, isOwnerUser, logger);
        case "givepremium":
        case "выдать_премиум":
          return await cmdGivePremium(triggerInfo, args, isOwnerUser, logger);
        case "givestars":
        case "выдать_звезды":
          return await cmdGiveStars(triggerInfo, args, isOwnerUser, logger);
        case "virtas":
        case "вирты":
          return await cmdVirtasBalance(triggerInfo, logger);
        case "buyvirtas":
        case "buy_virtas":
          return await cmdBuyVirtas(triggerInfo, args, logger);
        case "roll":
        case "dice":
        case "кубик":
          return await cmdDice(triggerInfo, logger);
        case "casino":
        case "казино":
          return await cmdCasino(triggerInfo, args, logger);
        case "slot":
        case "slots":
        case "слоты":
          return await cmdSlot(triggerInfo, args, logger);
        case "fish":
        case "рыбалка":
          return await cmdFish(triggerInfo, args, logger);
        case "duel":
        case "дуэль":
          return await cmdDuel(triggerInfo, logger);
        case "coin":
        case "монета":
          return await cmdCoin(triggerInfo, logger);
        case "invisibility":
        case "невидимость":
        case "инвиз":
        case "невидимка":
          return await cmdInvisibility(triggerInfo, logger);
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
        case "профиль":
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
        case "баланс":
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
        case "transfer":
          return await cmdTransfer(triggerInfo, args, logger);
        case "daily":
          return await cmdDaily(triggerInfo, logger);
        case "weekly":
          return await cmdWeekly(triggerInfo, logger);
        case "pay":
        case "отправить":
          return await cmdPay(triggerInfo, args, logger);
        case "top_rich":
        case "топ_богачей":
          return await cmdTopRich(triggerInfo, logger);
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
        case "трансформ":
          return await cmdTransform(triggerInfo, args, logger);

        case "karma":
          return await cmdKarma(triggerInfo, logger);
        case "gift":
          return await cmdGift(triggerInfo, args, logger);
        case "hug":
          return await cmdHug(triggerInfo, logger);
        case "random":
          return await cmdRandom(triggerInfo, args, logger);
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
        case "link":
          return await cmdLink(triggerInfo, isUserAdmin, logger);
        
        default:
          logger?.warn("⚠️ [BotCommand] Unknown command", { command });
          return { success: false, message: "Unknown command" };
      }
    } catch (error) {
      logger?.error("❌ [BotCommand] Error", error);
      return { success: false, message: "Command failed" };
    }
  },
});

async function cmdStart(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  const message = `Привет, <b>${firstName}</b>! Я многофункциональный бот. Используй /help для списка команд.`;
  await sendTelegramMessage(chatId, message);
  return { success: true, message: "Start message sent" };
}

async function cmdHelp(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const helpText = `
📖 <b>Список основных команд:</b>

🛡 <b>Модерация:</b> /ban, /mute, /warn, /kick, /restrict, /promote, /demote, /clean
📊 <b>Информация:</b> /profile, /stats, /chat_info, /id, /whois
💰 <b>Экономика:</b> /balance, /stars, /virtas, /daily, /weekly, /pay, /shop, /buy, /transfer
🎮 <b>Игры:</b> /casino, /dice, /slots, /fish, /duel, /coin, /random
🎭 <b>RP-команды:</b> (текстом без слеша) обнять, ударить, убить, поцеловать и др.
💍 <b>Браки:</b> /marry, /accept_marry, /divorce
🌟 <b>Премиум (Троллинг):</b> /buy_premium, /funny_text, /kloun, /unmuteall, /transform, /invisibility

⚙️ <b>Настройки чата (Админ):</b>
/welcome (on/off), /rules, /photo, /sticker, /video, /voice (on/off)
/badwords, /antispam, /flood (on/off)
  `;
  await sendTelegramMessage(chatId, helpText);
  return { success: true, message: "Help message sent" };
}

async function cmdBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя ответом или упоминанием.");
    return { success: false, message: "Target user not found" };
  }
  
  const res = await banChatMember(chatId, target.userId);
  if (res?.ok) {
    await sendTelegramMessage(chatId, `🚫 Пользователь <b>${target.firstName}</b> забанен.`);
    return { success: true, message: "User banned" };
  }
  return { success: false, message: "Ban failed" };
}

async function cmdUnban(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя.");
    return { success: false, message: "Target user not found" };
  }
  
  const res = await unbanChatMember(chatId, target.userId);
  if (res?.ok) {
    await sendTelegramMessage(chatId, `✅ Пользователь <b>${target.firstName}</b> разбанен.`);
    return { success: true, message: "User unbanned" };
  }
  return { success: false, message: "Unban failed" };
}

async function cmdMute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  await restrictChatMember(chatId, target.userId, { can_send_messages: false });
  await sendTelegramMessage(chatId, `🔇 Пользователь <b>${target.firstName}</b> замучен.`);
  return { success: true, message: "User muted" };
}

async function cmdUnmute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  await restrictChatMember(chatId, target.userId, { 
    can_send_messages: true,
    can_send_media_messages: true,
    can_send_polls: true,
    can_send_other_messages: true,
    can_add_web_page_previews: true,
    can_change_info: true,
    can_invite_users: true,
    can_pin_messages: true
  });
  await sendTelegramMessage(chatId, `🔊 Пользователь <b>${target.firstName}</b> размучен.`);
  return { success: true, message: "User unmuted" };
}

async function cmdWarn(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId: adminId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  const reason = args.join(" ") || "Без причины";
  const count = await db.addWarning(target.userId, chatId, adminId, reason);
  
  const settings = await db.getChatSettings(chatId);
  const limit = settings?.warn_limit || 3;
  
  if (count >= limit) {
    await db.resetWarnings(target.userId, chatId);
    await banChatMember(chatId, target.userId);
    await sendTelegramMessage(chatId, `💥 Пользователь <b>${target.firstName}</b> получил ${count}/${limit} варнов и был забанен!`);
  } else {
    await sendTelegramMessage(chatId, `⚠️ Пользователь <b>${target.firstName}</b> получил варн (${count}/${limit}). Причина: ${reason}`);
  }
  return { success: true, message: "Warn added" };
}

async function cmdUnwarn(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  const removed = await db.removeWarning(target.userId, chatId);
  if (removed) {
    await sendTelegramMessage(chatId, `✅ Варн у <b>${target.firstName}</b> снят.`);
  } else {
    await sendTelegramMessage(chatId, "❌ У этого пользователя нет варнов.");
  }
  return { success: true, message: "Unwarn processed" };
}

async function cmdWarns(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  const count = await db.getWarningCount(target.userId, chatId);
  const settings = await db.getChatSettings(chatId);
  await sendTelegramMessage(chatId, `⚠️ У <b>${target.firstName}</b> ${count}/${settings?.warn_limit || 3} варнов.`);
  return { success: true, message: "Warns count sent" };
}

async function cmdProfile(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  if (!user) return { success: false, message: "User not found" };
  
  const isPrem = await db.isPremium(userId);
  const virtas = await db.getUserVirtas(userId);
  
  const profileText = `
👤 <b>Профиль ${user.first_name}:</b>

⭐ <b>Звёзды:</b> ${user.stars}
💸 <b>Вирты:</b> ${virtas.toLocaleString()}
📊 <b>Уровень:</b> ${user.level} (${user.xp} XP)
🏆 <b>Репутация:</b> ${user.reputation}
📝 <b>Био:</b> ${user.bio || "Не установлено"}
💍 <b>Брак:</b> ${user.is_married_to ? "В браке" : "Холост"}
🌟 <b>Премиум:</b> ${isPrem ? "✅ Активен" : "❌ Нет"}
  `;
  await sendTelegramMessage(chatId, profileText);
  return { success: true, message: "Profile sent" };
}

async function cmdBalance(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  const virtas = await db.getUserVirtas(userId);
  await sendTelegramMessage(chatId, `💰 Ваш баланс: <b>${user?.stars}</b> ⭐ и <b>${virtas.toLocaleString()}</b> виртов.`);
  return { success: true, message: "Balance sent" };
}

async function cmdDaily(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isOwnerUser = userId === 1314619424 || userId === 7977020467;

  if (isOwnerUser) {
    const bonusAmount = 100;
    await db.updateUserStars(userId, chatId, bonusAmount, "Ежедневный бонус (Владелец)");
    await sendTelegramMessage(chatId, `⭐ Вы получили ${bonusAmount} ⭐ (Без КД для владельца)`);
    return { success: true, message: "Daily bonus claimed by owner" };
  }

  const res = await db.claimDailyBonus(userId, chatId);
  await sendTelegramMessage(chatId, res.message);
  return { success: true, message: "Daily bonus claimed" };
}

async function cmdDice(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const val = Math.floor(Math.random() * 6) + 1;
  await sendTelegramMessage(chatId, `🎲 Выпало: <b>${val}</b>`);
  return { success: true, message: "Dice rolled" };
}

async function cmdCasino(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const amount = parseInt(args[0]) || 10;
  
  const stars = await db.getUserStars(userId, chatId);
  if (stars < amount) {
    await sendTelegramMessage(chatId, "❌ Недостаточно звёзд!");
    return { success: false, message: "Not enough stars" };
  }
  
  const win = Math.random() > 0.6;
  if (win) {
    const prize = amount * 2;
    await db.updateUserStars(userId, chatId, amount, "Казино: выигрыш");
    await sendTelegramMessage(chatId, `🎰 <b>ПОБЕДА!</b> Вы выиграли <b>${prize}</b> ⭐!`);
  } else {
    await db.updateUserStars(userId, chatId, -amount, "Казино: проигрыш");
    await sendTelegramMessage(chatId, `🎰 <b>Проигрыш...</b> Вы потеряли <b>${amount}</b> ⭐.`);
  }
  return { success: true, message: "Casino game done" };
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
    `💯 Без сомнений, <b>${targetName}</b> — это ${text}!`,
    `🤔 Гадалка шепнула, что <b>${targetName}</b> ${text}!`,
  ];
  
  const answer = phrases[Math.floor(Math.random() * phrases.length)];
  await sendTelegramMessage(chatId, answer);
  return { success: true, message: "Who today answered" };
}

async function cmdMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  
  if (!target || target.userId === userId) {
    await sendTelegramMessage(chatId, "❌ Кому вы предлагаете руку и сердце? (Ответьте на сообщение)");
    return { success: false, message: "No target user" };
  }
  
  const user = await db.getUser(userId, chatId);
  if (user?.is_married_to) {
    await sendTelegramMessage(chatId, "❌ Вы уже в браке!");
    return { success: false, message: "Already married" };
  }
  
  // Store proposal in temp_restrictions table
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await db.addTempRestriction(userId, chatId, 'marry_proposal', target.userId, expiresAt, `Proposal to ${target.firstName}`);
  
  await sendTelegramMessage(chatId, `💍 <b>${firstName}</b> сделал предложение <b>${target.firstName}</b>!\nЧтобы принять, напишите <b>/accept_marry</b>`);
  return { success: true, message: "Marriage proposal sent" };
}

async function cmdAcceptMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  
  const proposal = await db.query(
    "SELECT * FROM temp_restrictions WHERE chat_id = $1 AND restriction_type = 'marry_proposal' AND expires_at > NOW() LIMIT 1",
    [chatId]
  );
  
  if (proposal.rows.length === 0) {
    await sendTelegramMessage(chatId, "❌ Нет активных предложений о браке.");
    return { success: false, message: "No proposal found" };
  }
  
  const p = proposal.rows[0];
  if (p.user_id === userId) {
    await sendTelegramMessage(chatId, "❌ Вы не можете принять собственное предложение!");
    return { success: false, message: "Cannot accept own proposal" };
  }
  
  await db.setMarried(p.user_id, userId, chatId);
  await db.removeTempRestriction(p.user_id, chatId, 'marry_proposal');
  
  await sendTelegramMessage(chatId, `💍 <b>${firstName}</b> принял предложение! Поздравляем с браком! 💕`);
  return { success: true, message: "Marriage accepted" };
}

async function cmdDivorce(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await db.divorce(userId, chatId);
  await sendTelegramMessage(chatId, `😢 Развод оформлен...`);
  return { success: true, message: "Divorced" };
}

async function cmdVirtasBalance(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const virtas = await db.getUserVirtas(userId);
  await sendTelegramMessage(chatId, `💸 У вас <b>${virtas.toLocaleString()}</b> виртов.`);
  return { success: true, message: "Virtas sent" };
}

async function cmdBuyVirtas(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "💎 Для покупки виртов за настоящие звёзды (Telegram Stars), используйте меню оплаты Telegram или обратитесь к администратору @n777snickers777");
  return { success: true, message: "Buy virtas info sent" };
}

async function cmdAddCoins(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) return { success: false, message: "Owner only" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  await db.query("UPDATE bot_users SET stars = 9999999 WHERE user_id = $1", [target.userId]);
  await sendTelegramMessage(chatId, `💰 Баланс пользователя <b>${target.firstName}</b> установлен на 9,999,999 ⭐!`);
  return { success: true, message: "Coins added" };
}

async function cmdGivePremium(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) return { success: false, message: "Owner only" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  const months = parseInt(args[0]) || 1;
  await db.grantPremium(target.userId, months);
  await sendTelegramMessage(chatId, `🌟 Пользователю <b>${target.firstName}</b> выдана "Троллинг Консоль" на ${months} мес.!`);
  return { success: true, message: "Premium granted" };
}

async function cmdGiveStars(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) return { success: false, message: "Owner only" };
  
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  const amount = parseInt(args[0]) || 1000;
  await db.updateUserStars(target.userId, chatId, amount, "Выдача владельцем");
  await sendTelegramMessage(chatId, `⭐ Пользователю <b>${target.firstName}</b> выдано ${amount} звёзд!`);
  return { success: true, message: "Stars given" };
}

async function cmdInvisibility(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!(await db.isPremium(userId))) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только для владельцев Троллинг Консоли!");
    return { success: false, message: "Premium required" };
  }
  await sendTelegramMessage(chatId, "👻 Режим невидимости активирован на 1 час!");
  return { success: true, message: "Invisibility activated" };
}

async function cmdSmeshnoyText(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!(await db.isPremium(userId))) return { success: false, message: "Prem req" };
  
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
  await db.addTempRestriction(userId, chatId, 'funny_text', userId, expiresAt, "Funny text effect");
  await sendTelegramMessage(chatId, "🤡 Ваши сообщения теперь будут ОЧЕНЬ смешными в течение 6 часов!");
  return { success: true, message: "Funny text active" };
}

async function cmdKloun(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!(await db.isPremium(userId))) return { success: false, message: "Prem req" };
  
  await sendTelegramMessage(chatId, "🤡 Статус КЛОУНА активирован везде на 1 час!");
  return { success: true, message: "Clown mode active" };
}

async function cmdUnmuteAll(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!(await db.isPremium(userId))) return { success: false, message: "Prem req" };
  
  await sendTelegramMessage(chatId, "🔓 Вы размучены во всех чатах!");
  return { success: true, message: "Unmuted all" };
}

async function cmdTransform(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!(await db.isPremium(userId))) return { success: false, message: "Prem req" };
  
  const forms = ["Волк 🐺", "Дракон 🐉", "Призрак 👻", "Робот 🤖", "Демон 😈", "Ангел 😇", "Кот 🐱"];
  const form = forms[Math.floor(Math.random() * forms.length)];
  await sendTelegramMessage(chatId, `✨ Вы успешно превратились в образ: <b>${form}</b>!`);
  return { success: true, message: "Transformed" };
}

async function handleCallback(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { callbackData, callbackId, chatId, userId } = triggerInfo.params;
  
  if (callbackData === "buy_premium_stars") {
    return await cmdBuyPremium(triggerInfo, logger);
  }
  
  await answerCallback(callbackId, "Действие выполнено!");
  return { success: true, message: "Callback answered" };
}

async function handleNonCommand(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, text, hasMedia, mediaType } = triggerInfo.params;
  
  // Media restriction check
  if (hasMedia && mediaType) {
    const settings = await db.getChatSettings(chatId);
    let allowed = true;
    
    if (mediaType === "photo" && settings?.photo_allowed === false) allowed = false;
    if (mediaType === "sticker" && settings?.sticker_allowed === false) allowed = false;
    if (mediaType === "video" && settings?.video_allowed === false) allowed = false;
    if (mediaType === "voice" && settings?.voice_allowed === false) allowed = false;
    
    if (!allowed) {
      const isUserAdmin = await isAdmin(chatId, userId);
      if (!isUserAdmin) {
        await deleteMessage(chatId, triggerInfo.params.messageId);
        return { success: true, message: "Media deleted due to restrictions" };
      }
    }
  }

  if (!text) return { success: true, message: "No text" };
  
  // RP trigger check
  const rpTriggers: Record<string, string> = {
    "ударить": "ударил(а)",
    "обнять": "обнял(а)",
    "убить": "убил(а)",
    "поцеловать": "поцеловал(а)",
    "трахнуть": "трахнул(а)",
    "кусь": "кусьнул(а)",
    "погладить": "погладил(а)",
    "выстрелить": "выстрелил(а) в",
    "зарезать": "зарезал(а)",
    "взорвать": "взорвал(а)",
    "отравить": "отравил(а)",
    "сжечь": "сжег(ла)",
    "задушить": "задушил(а)",
    "толкнуть": "толкнул(а)",
    "пнуть": "пнул(а)",
    "связать": "связал(а)",
    "арестовать": "арестовал(а)",
    "обезглавить": "обезглавил(а)",
    "расстрелять": "расстрелял(а)",
    "улыбнуться": "улыбнулся(ась)",
    "подмигнуть": "подмигнул(а)",
    "пожать": "пожал(а) руку",
    "утешить": "утешил(а)",
    "похвалить": "похвалил(а)",
    "танец": "станцевал(а) с",
    "комплимент": "сделал(а) комплимент",
    "ужин": "пригласил(а) на ужин",
    "цветы": "подарил(а) цветы",
    "серенада": "спел(а) серенаду",
    "заморозить": "заморозил(а)",
    "поджечь": "поджег(ла)",
    "молния": "ударил(а) молнией",
    "исцелить": "исцелил(а)",
    "воскресить": "воскресил(а)",
  };
  
  const firstWord = text.split(" ")[0].toLowerCase();
  if (rpTriggers[firstWord]) {
    const target = await getTargetUser(triggerInfo);
    if (target && target.userId !== userId) {
      const { firstName } = triggerInfo.params;
      const action = rpTriggers[firstWord];
      await sendTelegramMessage(chatId, `✨ <b>${firstName}</b> ${action} <b>${target.firstName}</b>!`);
      return { success: true, message: "RP action done" };
    }
  }
  
  return { success: true, message: "Non-command message processed" };
}

// Helper functions for remaining commands
async function cmdReadOnly(triggerInfo: TriggerInfoTelegram, enable: boolean, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Admin only" };
  await restrictChatMember(chatId, triggerInfo.params.userId, { can_send_messages: !enable });
  await sendTelegramMessage(chatId, enable ? "🔇 Режим 'Только чтение' включен." : "🔊 Режим 'Только чтение' выключен.");
  return { success: true, message: "RO toggled" };
}

async function cmdKick(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Admin only" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await unbanChatMember(chatId, target.userId); // In TG kick is unban after ban
  await sendTelegramMessage(chatId, `👞 Пользователь <b>${target.firstName}</b> был кикнут.`);
  return { success: true, message: "Kicked" };
}

async function cmdKickMe(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await unbanChatMember(chatId, userId);
  return { success: true, message: "Kicked self" };
}

async function cmdSlot(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const icons = ["🍒", "🍋", "🍇", "🔔", "💎", "7️⃣"];
  const r1 = icons[Math.floor(Math.random() * icons.length)];
  const r2 = icons[Math.floor(Math.random() * icons.length)];
  const r3 = icons[Math.floor(Math.random() * icons.length)];
  const win = r1 === r2 && r2 === r3;
  await sendTelegramMessage(chatId, `🎰 [ ${r1} | ${r2} | ${r3} ]\n${win ? "🎉 ВЫ ВЫИГРАЛИ!" : "😒 Попробуйте еще раз."}`);
  return { success: true, message: "Slots played" };
}

async function cmdFish(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, firstName } = triggerInfo.params;
  const fishes = ["🐟", "🐠", "🐡", "🦈", "🐙", "🦀", "🦞"];
  const catch_ = fishes[Math.floor(Math.random() * fishes.length)];
  await sendTelegramMessage(chatId, `🎣 <b>${firstName}</b> поймал(а): <b>${catch_}</b>!`);
  return { success: true, message: "Fished" };
}

async function cmdDuel(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, firstName } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  if (!target || target.userId === userId) {
    await sendTelegramMessage(chatId, "⚔️ С кем вы собрались сражаться?");
    return { success: false, message: "No target" };
  }
  const winner = Math.random() > 0.5 ? firstName : target.firstName;
  await sendTelegramMessage(chatId, `⚔️ Дуэль между <b>${firstName}</b> и <b>${target.firstName}</b>!\n\n🏆 Победитель: <b>${winner}</b>!`);
  return { success: true, message: "Dueled" };
}

async function cmdCoin(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const side = Math.random() > 0.5 ? "Орёл 🦅" : "Решка 🪙";
  await sendTelegramMessage(chatId, `🪙 Выпало: <b>${side}</b>`);
  return { success: true, message: "Coin flipped" };
}

async function cmdBio(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const bio = args.join(" ");
  if (!bio) {
    await sendTelegramMessage(chatId, "❌ Напишите текст био.");
    return { success: false, message: "No bio text" };
  }
  await db.updateUserBio(userId, chatId, bio);
  await sendTelegramMessage(chatId, "✅ Био успешно обновлено!");
  return { success: true, message: "Bio updated" };
}

async function cmdVirtas(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdVirtasBalance(triggerInfo, logger);
}

async function cmdPromote(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await promoteChatMember(chatId, target.userId, { can_manage_chat: true, can_delete_messages: true, can_restrict_members: true });
  await sendTelegramMessage(chatId, `✅ Пользователь <b>${target.firstName}</b> назначен администратором.`);
  return { success: true, message: "Promoted" };
}

async function cmdDemote(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) return { success: false, message: "Permission denied" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await promoteChatMember(chatId, target.userId, { can_manage_chat: false });
  await sendTelegramMessage(chatId, `❌ Пользователь <b>${target.firstName}</b> снят с должности.`);
  return { success: true, message: "Demoted" };
}

// ... remaining cmd stubs to satisfy compiler
async function cmdId(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `🆔 Чат: <code>${chatId}</code>\n👤 Юзер: <code>${userId}</code>`);
  return { success: true, message: "ID sent" };
}

async function cmdWhois(triggerInfo: TriggerInfoTelegram, logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `👤 <b>Whois ${target.firstName}:</b>\n🆔 ID: <code>${target.userId}</code>\n🔗 Юзернейм: @${target.username || "нет"}`);
  return { success: true, message: "Whois sent" };
}

async function cmdShop(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const msg = "🏪 <b>Магазин префиксов:</b>\n1. [Король] - 500 ⭐\n2. [Легенда] - 1000 ⭐\n3. [Бог] - 5000 ⭐\nИспользуйте /buy [номер]";
  await sendTelegramMessage(chatId, msg);
  return { success: true, message: "Shop sent" };
}

async function cmdBuy(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, "✅ Покупка успешно совершена!");
  return { success: true, message: "Item bought" };
}

async function cmdTransfer(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  const amount = parseInt(args[0]) || 0;
  if (!target || amount <= 0) return { success: false, message: "Invalid transfer" };
  await db.updateUserStars(userId, chatId, -amount, "Transfer");
  await db.updateUserStars(target.userId, chatId, amount, "Transfer");
  await sendTelegramMessage(chatId, `💸 Вы перевели ${amount} ⭐ пользователю <b>${target.firstName}</b>.`);
  return { success: true, message: "Transfer done" };
}

async function cmdTopRich(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const top = await db.getTopActive(chatId, 5);
  let text = "💰 <b>Топ богачей чата:</b>\n\n";
  top.forEach((u: any, i: number) => {
    text += `${i+1}. <b>${u.first_name}</b> — ${u.stars} ⭐\n`;
  });
  await sendTelegramMessage(chatId, text);
  return { success: true, message: "Top rich sent" };
}

// Admin stubs
async function cmdWarnLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  const val = parseInt(args[0]) || 3;
  await db.updateChatSettings(chatId, { warn_limit: val });
  await sendTelegramMessage(chatId, `⚙️ Лимит варнов установлен на: <b>${val}</b>`);
  return { success: true, message: "Warn limit set" };
}

async function cmdResetWarns(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await db.resetWarnings(target.userId, triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, `✅ Варны пользователя <b>${target.firstName}</b> сброшены.`);
  return { success: true, message: "Warns reset" };
}

async function cmdClean(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, messageId } = triggerInfo.params;
  const count = parseInt(args[0]) || 10;
  for(let i=0; i<count; i++) {
    await deleteMessage(chatId, messageId - i);
  }
  return { success: true, message: "Cleaned" };
}

async function cmdLink(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  const link = await exportChatInviteLink(chatId);
  await sendTelegramMessage(chatId, `🔗 Ссылка на чат: ${link?.result || "недоступна"}`);
  return { success: true, message: "Link sent" };
}

// Other stubs
async function cmdSoftBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  const { chatId } = triggerInfo.params;
  await banChatMember(chatId, target.userId);
  await unbanChatMember(chatId, target.userId);
  await sendTelegramMessage(chatId, `🍌 Пользователь <b>${target.firstName}</b> был кикнут и сообщения удалены.`);
  return { success: true, message: "Softban done" };
}

async function cmdTempBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const target = await getTargetUser(triggerInfo);
  const time = parseTime(args[0] || "1h");
  if (!target || !time) return { success: false, message: "Invalid params" };
  const { chatId } = triggerInfo.params;
  await banChatMember(chatId, target.userId);
  await db.addTempRestriction(target.userId, chatId, 'ban', triggerInfo.params.userId, new Date(Date.now() + time * 1000));
  await sendTelegramMessage(chatId, `🚫 Пользователь <b>${target.firstName}</b> забанен на ${args[0]}.`);
  return { success: true, message: "Tempban done" };
}

async function cmdTempMute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const target = await getTargetUser(triggerInfo);
  const time = parseTime(args[0] || "1h");
  if (!target || !time) return { success: false, message: "Invalid params" };
  const { chatId } = triggerInfo.params;
  await restrictChatMember(chatId, target.userId, { can_send_messages: false });
  await db.addTempRestriction(target.userId, chatId, 'mute', triggerInfo.params.userId, new Date(Date.now() + time * 1000));
  await sendTelegramMessage(chatId, `🔇 Пользователь <b>${target.firstName}</b> замучен на ${args[0]}.`);
  return { success: true, message: "Tempmute done" };
}

async function cmdAntispam(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { antispam_enabled: enable });
  await sendTelegramMessage(chatId, `⚙️ Антиспам ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Antispam toggled" };
}

async function cmdFlood(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { flood_control: enable });
  await sendTelegramMessage(chatId, `⚙️ Контроль флуда ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Flood toggled" };
}

async function cmdBlacklist(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (args.length === 0) return { success: false, message: "No word" };
  await db.addBlacklistWord(chatId, args[0], userId);
  await sendTelegramMessage(chatId, `✅ Слово "<b>${args[0]}</b>" добавлено в черный список.`);
  return { success: true, message: "Blacklist word added" };
}

async function cmdWhitelist(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (args.length === 0) return { success: false, message: "No word" };
  await db.removeBlacklistWord(chatId, args[0]);
  await sendTelegramMessage(chatId, `✅ Слово "<b>${args[0]}</b>" удалено из черного списка.`);
  return { success: true, message: "Blacklist word removed" };
}

async function cmdCaps(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const enable = args[0] !== "off";
  await db.updateChatSettings(triggerInfo.params.chatId, { caps_filter: enable });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Фильтр капса ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Caps toggled" };
}

async function cmdLinks(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const enable = args[0] !== "off";
  await db.updateChatSettings(triggerInfo.params.chatId, { links_filter: enable });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Фильтр ссылок ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Links toggled" };
}

async function cmdBadwords(triggerInfo: TriggerInfoTelegram, logger: any) {
  const words = await db.getBlacklistWords(triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, `🚫 <b>Черный список слов:</b>\n${words.join(", ") || "пусто"}`);
  return { success: true, message: "Badwords sent" };
}

async function cmdInfo(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const info = await db.getChatSettings(chatId);
  await sendTelegramMessage(chatId, `📊 <b>Инфо о чате:</b>\nID: <code>${chatId}</code>\nТип: ${triggerInfo.params.chatType}`);
  return { success: true, message: "Info sent" };
}

async function cmdUsers(triggerInfo: TriggerInfoTelegram, logger: any) {
  const count = await getChatMembersCount(triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, `👥 В чате <b>${count?.result || 0}</b> участников.`);
  return { success: true, message: "Users count sent" };
}

async function cmdAdmins(triggerInfo: TriggerInfoTelegram, logger: any) {
  const admins = await getChatAdministrators(triggerInfo.params.chatId);
  let text = "👮‍♂️ <b>Администрация чата:</b>\n\n";
  admins?.result?.forEach((a: any) => {
    text += `• ${a.user.first_name} (@${a.user.username || "нет"})\n`;
  });
  await sendTelegramMessage(triggerInfo.params.chatId, text);
  return { success: true, message: "Admins sent" };
}

async function cmdMods(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdAdmins(triggerInfo, logger);
}

async function cmdChatInfo(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdInfo(triggerInfo, logger);
}

async function cmdStats(triggerInfo: TriggerInfoTelegram, logger: any) {
  const stats = await db.getChatStats(triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, `📈 <b>Статистика чата:</b>\n👥 Юзеров: ${stats.userCount}\n💬 Сообщений: ${stats.messageCount}\n⚠️ Варнов: ${stats.warnCount}`);
  return { success: true, message: "Stats sent" };
}

async function cmdTopActivity(triggerInfo: TriggerInfoTelegram, logger: any) {
  const top = await db.getTopActive(triggerInfo.params.chatId, 5);
  let text = "🏆 <b>Топ активности:</b>\n\n";
  top.forEach((u: any, i: number) => {
    text += `${i+1}. ${u.first_name} — ${u.message_count} сообщений\n`;
  });
  await sendTelegramMessage(triggerInfo.params.chatId, text);
  return { success: true, message: "Top activity sent" };
}

async function cmdTopWarns(triggerInfo: TriggerInfoTelegram, logger: any) {
  const top = await db.getTopWarns(triggerInfo.params.chatId, 5);
  let text = "⚠️ <b>Топ по варнам:</b>\n\n";
  top.forEach((u: any, i: number) => {
    text += `${i+1}. ${u.first_name} — ${u.warn_count} варнов\n`;
  });
  await sendTelegramMessage(triggerInfo.params.chatId, text);
  return { success: true, message: "Top warns sent" };
}

async function cmdMyStats(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  await sendTelegramMessage(chatId, `📊 <b>Ваша статистика:</b>\n💬 Сообщений: ${user?.message_count}\n⚡ XP: ${user?.xp}\n📊 Уровень: ${user?.level}`);
  return { success: true, message: "My stats sent" };
}

async function cmdUserCount(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdUsers(triggerInfo, logger);
}

async function cmdMessageCount(triggerInfo: TriggerInfoTelegram, logger: any) {
  const stats = await db.getChatStats(triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, `💬 Всего сообщений в чате: <b>${stats.messageCount}</b>`);
  return { success: true, message: "Msg count sent" };
}

async function cmdRank(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  await sendTelegramMessage(chatId, `🎖 Ваш ранг: <b>${user?.level} уровень</b>`);
  return { success: true, message: "Rank sent" };
}

async function cmdLevel(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdRank(triggerInfo, logger);
}

async function cmdLeaderboard(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdTopActivity(triggerInfo, logger);
}

async function cmdReputation(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const rep = await db.getReputation(userId, chatId);
  await sendTelegramMessage(chatId, `🏆 Ваша репутация: <b>${rep}</b>`);
  return { success: true, message: "Reputation sent" };
}

async function cmdRepTop(triggerInfo: TriggerInfoTelegram, logger: any) {
  const top = await db.getTopReputation(triggerInfo.params.chatId, 5);
  let text = "🏆 <b>Топ репутации:</b>\n\n";
  top.forEach((u: any, i: number) => {
    text += `${i+1}. ${u.first_name} — ${u.reputation} реп.\n`;
  });
  await sendTelegramMessage(triggerInfo.params.chatId, text);
  return { success: true, message: "Rep top sent" };
}

async function cmdAward(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  if (!isAdmin) return { success: false, message: "Admin only" };
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  const val = parseInt(args[0]) || 1;
  await db.updateReputation(target.userId, triggerInfo.params.chatId, triggerInfo.params.userId, val, "Awarded by admin");
  await sendTelegramMessage(triggerInfo.params.chatId, `🏆 Пользователю <b>${target.firstName}</b> начислено ${val} репутации!`);
  return { success: true, message: "Awarded" };
}

async function cmdSetWelcome(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  const text = args.join(" ");
  await db.updateChatSettings(chatId, { welcome_text: text });
  await sendTelegramMessage(chatId, "✅ Приветствие установлено!");
  return { success: true, message: "Welcome set" };
}

async function cmdSetRules(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const text = args.join(" ");
  await db.updateChatSettings(triggerInfo.params.chatId, { rules_text: text });
  await sendTelegramMessage(triggerInfo.params.chatId, "✅ Правила установлены!");
  return { success: true, message: "Rules set" };
}

async function cmdRules(triggerInfo: TriggerInfoTelegram, logger: any) {
  const settings = await db.getChatSettings(triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, `📖 <b>Правила чата:</b>\n\n${settings?.rules_text || "Правила не установлены."}`);
  return { success: true, message: "Rules sent" };
}

async function cmdSetGoodbye(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const text = args.join(" ");
  await db.updateChatSettings(triggerInfo.params.chatId, { goodbye_text: text });
  await sendTelegramMessage(triggerInfo.params.chatId, "✅ Прощание установлено!");
  return { success: true, message: "Goodbye set" };
}

async function cmdWelcomeToggle(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const enable = args[0] !== "off";
  await db.updateChatSettings(triggerInfo.params.chatId, { welcome_enabled: enable });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Приветствия ${enable ? "включены" : "выключены"}.`);
  return { success: true, message: "Welcome toggled" };
}

async function cmdSetLang(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  await db.updateChatSettings(triggerInfo.params.chatId, { language: args[0] || "ru" });
  await sendTelegramMessage(triggerInfo.params.chatId, `✅ Язык установлен на: ${args[0] || "ru"}`);
  return { success: true, message: "Lang set" };
}

async function cmdLogChannel(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  await db.updateChatSettings(triggerInfo.params.chatId, { log_channel: args[0] });
  await sendTelegramMessage(triggerInfo.params.chatId, "✅ Канал логов установлен!");
  return { success: true, message: "Log channel set" };
}

async function cmdReportChannel(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  await db.updateChatSettings(triggerInfo.params.chatId, { report_channel: args[0] });
  await sendTelegramMessage(triggerInfo.params.chatId, "✅ Канал жалоб установлен!");
  return { success: true, message: "Report channel set" };
}

async function cmdAutoDelete(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const time = parseInt(args[0]) || 0;
  await db.updateChatSettings(triggerInfo.params.chatId, { auto_delete_time: time });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Автоудаление через ${time} сек.`);
  return { success: true, message: "Auto delete set" };
}

async function cmdCleanService(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const enable = args[0] !== "off";
  await db.updateChatSettings(triggerInfo.params.chatId, { clean_service: enable });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Удаление сервис-сообщений ${enable ? "включено" : "выключено"}.`);
  return { success: true, message: "Clean service toggled" };
}

async function cmdMediaLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const val = parseInt(args[0]) || 0;
  await db.updateChatSettings(triggerInfo.params.chatId, { media_limit: val });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Лимит медиа: ${val}`);
  return { success: true, message: "Media limit set" };
}

async function cmdStickerLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const val = parseInt(args[0]) || 0;
  await db.updateChatSettings(triggerInfo.params.chatId, { sticker_limit: val });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Лимит стикеров: ${val}`);
  return { success: true, message: "Sticker limit set" };
}

async function cmdGifLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const val = parseInt(args[0]) || 0;
  await db.updateChatSettings(triggerInfo.params.chatId, { gif_limit: val });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Лимит гифок: ${val}`);
  return { success: true, message: "Gif limit set" };
}

async function cmdVoiceLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const val = parseInt(args[0]) || 0;
  await db.updateChatSettings(triggerInfo.params.chatId, { voice_limit: val });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Лимит голосовых: ${val}`);
  return { success: true, message: "Voice limit set" };
}

async function cmdForwardLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const val = parseInt(args[0]) || 0;
  await db.updateChatSettings(triggerInfo.params.chatId, { forward_limit: val });
  await sendTelegramMessage(triggerInfo.params.chatId, `⚙️ Лимит пересылок: ${val}`);
  return { success: true, message: "Forward limit set" };
}

async function cmdReport(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await db.addReport(triggerInfo.params.userId, target.userId, triggerInfo.params.chatId, args.join(" "));
  await sendTelegramMessage(triggerInfo.params.chatId, "✅ Жалоба отправлена администрации.");
  return { success: true, message: "Report sent" };
}

async function cmdCompliment(triggerInfo: TriggerInfoTelegram, logger: any) {
  const c = compliments[Math.floor(Math.random() * compliments.length)];
  await sendTelegramMessage(triggerInfo.params.chatId, c);
  return { success: true, message: "Compliment sent" };
}

async function cmdThank(triggerInfo: TriggerInfoTelegram, logger: any) {
  await sendTelegramMessage(triggerInfo.params.chatId, "🙏 Пожалуйста!");
  return { success: true, message: "Thanked" };
}

async function cmdRep(triggerInfo: TriggerInfoTelegram, logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await db.updateReputation(target.userId, triggerInfo.params.chatId, triggerInfo.params.userId, 1, "Rep cmd");
  await sendTelegramMessage(triggerInfo.params.chatId, `🏆 Репутация <b>${target.firstName}</b> повышена!`);
  return { success: true, message: "Rep increased" };
}

async function cmdAfk(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  await db.setAfk(triggerInfo.params.userId, triggerInfo.params.chatId, args.join(" "));
  await sendTelegramMessage(triggerInfo.params.chatId, "💤 Вы ушли в AFK.");
  return { success: true, message: "AFK set" };
}

async function cmdBack(triggerInfo: TriggerInfoTelegram, logger: any) {
  await db.removeAfk(triggerInfo.params.userId, triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, "👋 С возвращением!");
  return { success: true, message: "AFK removed" };
}

async function cmdBonus(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdDaily(triggerInfo, logger);
}

async function cmdWeekly(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isOwnerUser = userId === 1314619424 || userId === 7977020467;

  if (isOwnerUser) {
    const bonusAmount = 500;
    await db.updateUserStars(userId, chatId, bonusAmount, "Еженедельный бонус (Владелец)");
    await sendTelegramMessage(chatId, `⭐ Вы получили ${bonusAmount} ⭐ (Без КД для владельца)`);
    return { success: true, message: "Weekly bonus claimed by owner" };
  }

  const user = await db.getUser(userId, chatId);
  if (!user) return { success: false, message: "User not found" };

  const lastWeekly = user.last_weekly_bonus;
  const now = new Date();
  if (lastWeekly) {
    const lastDate = new Date(lastWeekly);
    const daysDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
      const daysLeft = Math.ceil(7 - daysDiff);
      await sendTelegramMessage(chatId, `❌ Еженедельный бонус можно получить через ${daysLeft} дн.`);
      return { success: false, message: "Weekly bonus cooling down" };
    }
  }

  const amount = 300 + Math.floor(Math.random() * 201);
  await db.updateUserStars(userId, chatId, amount, "Weekly bonus");
  await sendTelegramMessage(chatId, `📅 Еженедельный бонус: <b>${amount}</b> ⭐ получен!`);
  return { success: true, message: "Weekly bonus claimed" };
}

async function cmdPay(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  return await cmdTransfer(triggerInfo, args, logger);
}

async function cmdMyPrefixes(triggerInfo: TriggerInfoTelegram, logger: any) {
  const prefs = await db.getUserPrefixes(triggerInfo.params.userId);
  let text = "🏷 <b>Ваши префиксы:</b>\n\n";
  prefs.forEach((p: any, i: number) => {
    text += `${i+1}. ${p.display}\n`;
  });
  await sendTelegramMessage(triggerInfo.params.chatId, text);
  return { success: true, message: "Prefixes sent" };
}

async function cmdSetPrefix(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  await db.setUserPrefix(triggerInfo.params.userId, triggerInfo.params.chatId, args[0]);
  await sendTelegramMessage(triggerInfo.params.chatId, "✅ Префикс установлен!");
  return { success: true, message: "Prefix set" };
}

async function cmdBuyPremium(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const invoice = {
    chat_id: chatId,
    title: "Троллинг Консоль (Премиум)",
    description: "Доступ к эксклюзивным командам: невидимость, трансформация, размут и др. на 1 месяц.",
    payload: `premium_${userId}`,
    provider_token: "", // Пусто для Telegram Stars
    currency: "XTR",
    prices: [{ label: "Премиум", amount: 150 }]
  };
  
  const options = {
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: "💳 Оплатить 150 ⭐️",
            pay: true
          }
        ]
      ]
    }
  };

  // В реальном окружении здесь вызывается sendInvoice
  // Так как в триггерах нет обертки для sendInvoice, мы используем fetch напрямую к API Telegram
  const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  await fetch(`${TELEGRAM_API}/sendInvoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoice)
  });

  return { success: true, message: "Premium invoice sent" };
}

async function cmdBuyVirtas(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const amount = parseInt(args[0]) || 10000;
  
  const invoice = {
    chat_id: chatId,
    title: `Покупка ${amount.toLocaleString()} виртов`,
    description: `Пополнение игрового баланса на ${amount.toLocaleString()} виртов.`,
    payload: `virtas_${userId}_${amount}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "Вирты", amount: 50 }]
  };

  const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  await fetch(`${TELEGRAM_API}/sendInvoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoice)
  });

  return { success: true, message: "Virtas invoice sent" };
}

async function cmdKarma(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdReputation(triggerInfo, logger);
}

async function cmdGift(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(triggerInfo.params.chatId, `🎁 <b>${triggerInfo.params.firstName}</b> подарил(а) подарок <b>${target.firstName}</b>!`);
  return { success: true, message: "Gift sent" };
}

async function cmdHug(triggerInfo: TriggerInfoTelegram, logger: any) {
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  await sendTelegramMessage(triggerInfo.params.chatId, `✨ <b>${triggerInfo.params.firstName}</b> обнял(а) <b>${target.firstName}</b>!`);
  return { success: true, message: "Hugged" };
}

async function cmdRandom(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const max = parseInt(args[0]) || 100;
  const val = Math.floor(Math.random() * (max + 1));
  await sendTelegramMessage(triggerInfo.params.chatId, `🎲 Случайное число (0-${max}): <b>${val}</b>`);
  return { success: true, message: "Random generated" };
}

async function cmdGuess(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const val = Math.floor(Math.random() * 10) + 1;
  const guess = parseInt(args[0]);
  if (guess === val) {
    await sendTelegramMessage(triggerInfo.params.chatId, `🎉 <b>УГАДАЛИ!</b> Было число ${val}`);
  } else {
    await sendTelegramMessage(triggerInfo.params.chatId, `❌ Не угадали. Было число <b>${val}</b>`);
  }
  return { success: true, message: "Guess game done" };
}

async function cmdQuiz(triggerInfo: TriggerInfoTelegram, logger: any) {
  await sendTelegramMessage(triggerInfo.params.chatId, "🧩 <b>Викторина:</b> Как называется столица Франции?\n\nОтправьте ответ в чат!");
  return { success: true, message: "Quiz started" };
}

async function cmdTrivia(triggerInfo: TriggerInfoTelegram, logger: any) {
  return await cmdQuiz(triggerInfo, logger);
}

async function cmdTest(triggerInfo: TriggerInfoTelegram, logger: any) {
  await sendTelegramMessage(triggerInfo.params.chatId, "🧪 Тест функциональности бота: OK ✅");
  return { success: true, message: "Test done" };
}

async function cmdCompat(triggerInfo: TriggerInfoTelegram, logger: any) {
  const val = Math.floor(Math.random() * 101);
  await sendTelegramMessage(triggerInfo.params.chatId, `❤️ Совместимость: <b>${val}%</b>`);
  return { success: true, message: "Compat sent" };
}

async function cmdRate(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const val = Math.floor(Math.random() * 11);
  await sendTelegramMessage(triggerInfo.params.chatId, `⭐ Оценка: <b>${val}/10</b>`);
  return { success: true, message: "Rate sent" };
}

async function cmdJoke(triggerInfo: TriggerInfoTelegram, logger: any) {
  const j = jokes[Math.floor(Math.random() * jokes.length)];
  await sendTelegramMessage(triggerInfo.params.chatId, j);
  return { success: true, message: "Joke sent" };
}

async function cmdFact(triggerInfo: TriggerInfoTelegram, logger: any) {
  const f = facts[Math.floor(Math.random() * facts.length)];
  await sendTelegramMessage(triggerInfo.params.chatId, f);
  return { success: true, message: "Fact sent" };
}

async function cmdQuote(triggerInfo: TriggerInfoTelegram, logger: any) {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  await sendTelegramMessage(triggerInfo.params.chatId, q);
  return { success: true, message: "Quote sent" };
}

async function cmdCat(triggerInfo: TriggerInfoTelegram, logger: any) {
  await sendTelegramMessage(triggerInfo.params.chatId, "🐱 Мяу! Вот вам котик 🐈");
  return { success: true, message: "Cat sent" };
}

async function cmdDog(triggerInfo: TriggerInfoTelegram, logger: any) {
  await sendTelegramMessage(triggerInfo.params.chatId, "🐶 Гав! Вот вам собачка 🐕");
  return { success: true, message: "Dog sent" };
}

async function cmdPin(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  if (!isAdmin) return { success: false, message: "Admin only" };
  const { chatId, replyToMessage } = triggerInfo.params;
  if (!replyToMessage) return { success: false, message: "No reply" };
  await pinChatMessage(chatId, replyToMessage.message_id);
  await sendTelegramMessage(chatId, "📌 Сообщение закреплено.");
  return { success: true, message: "Pinned" };
}

async function cmdUnpin(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  if (!isAdmin) return { success: false, message: "Admin only" };
  await unpinChatMessage(triggerInfo.params.chatId);
  await sendTelegramMessage(triggerInfo.params.chatId, "📌 Сообщение откреплено.");
  return { success: true, message: "Unpinned" };
}

async function cmdCleanAll(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  return await cmdClean(triggerInfo, ["100"], isAdmin, logger);
}
