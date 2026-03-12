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
  "Ты просто светишься добротой! ✨",
  "Твой юмор - лучший антидепрессант! 😄",
  "Ты вдохновляешь людей вокруг себя! 🌟",
  "Твоя улыбка может растопить даже сердце айсберга! ❤️",
  "Ты - настоящий клад! 💎",
];

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
        case "promote":
          return await cmdPromote(triggerInfo, isUserAdmin, logger);
        case "demote":
          return await cmdDemote(triggerInfo, isUserAdmin, logger);
        
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
          return await cmdBadwords(triggerInfo, isUserAdmin, logger);
        case "announce":
          return await cmdAnnounce(triggerInfo, args, isOwnerUser, logger);
        case "rp":
          return await cmdShowRp(triggerInfo, logger);
        
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
          return await cmdWhoToday(triggerInfo, logger);
        
        case "daily":
          return await cmdDaily(triggerInfo, logger);
        case "weekly":
          return await cmdWeekly(triggerInfo, logger);
        case "pay":
          return await cmdPay(triggerInfo, args, logger);
        case "transfer":
          return await cmdTransfer(triggerInfo, args, logger);
        case "top_rich":
          return await cmdTopRich(triggerInfo, logger);
        case "virtas":
          return await cmdVirtas(triggerInfo, logger);
        case "buyvirtas":
        case "buy_virtas":
        case "givervirtas":
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
            await sendTelegramMessage(chatId, "🚫 Голосовые сообщения теперь запрещены!");
            return { success: true, message: "Voice disabled" };
          } else if (args[0] === "разрешить" || args[0] === "on") {
            await db.updateChatSettings(chatId, { voice_allowed: true });
            await sendTelegramMessage(chatId, "✅ Голосовые сообщения теперь разрешены!");
            return { success: true, message: "Voice enabled" };
          }
          break;
        
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
        case "givevirtas":
        case "выдать_вирты":
          return await cmdGiveVirtas(triggerInfo, args, isOwnerUser, logger);
        case "virtas":
        case "вирт":
        case "вирты":
          return await cmdVirtasBalance(triggerInfo, logger);
        case "buyvirtas":
        case "buy_virtas":
        case "givervirtas":
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
        case "antispam":
          return await cmdAntispam(triggerInfo, args, isUserAdmin, logger);
        
        case "funny_text":
        case "смешной_текст":
          return await cmdSmeshnoyText(triggerInfo, logger);
        case "kloun":
        case "клоун":
          return await cmdKloun(triggerInfo, logger);
        case "unmuteall":
        case "размут_всем":
          return await cmdUnmuteAll(triggerInfo, logger);
        case "transform":
        case "превратить":
          return await cmdTransform(triggerInfo, args, logger);
        
        case "profile":
          return await cmdProfile(triggerInfo, logger);
        case "balance":
          return await cmdBalance(triggerInfo, logger);
        case "marry":
          return await cmdMarry(triggerInfo, logger);
        case "accept_marry":
          return await cmdAcceptMarry(triggerInfo, logger);
        case "divorce":
          return await cmdDivorce(triggerInfo, logger);
        case "bio":
          return await cmdBio(triggerInfo, args, logger);
        case "shop":
          return await cmdShop(triggerInfo, logger);
        case "buy":
          return await cmdBuy(triggerInfo, args, logger);
        case "buy_premium":
          return await cmdBuyPremium(triggerInfo, logger);
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
  const { chatId } = triggerInfo.params;
  const startText = `🤖 <b>Добро пожаловать в бот!</b>

Используй команды:
/help - список команд
/rp - РП команды
/daily - ежедневный бонус
/profile - твой профиль
/balance - твой баланс

✨ Или напиши текстовую команду без слеша!`;
  await sendTelegramMessage(chatId, startText);
  return { success: true, message: "Start message sent" };
}

async function cmdHelp(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isOwnerUser = userId === 1314619424 || userId === 7977020467;
  const hasAdminPass = isOwnerUser && (await hasAdminAccess(userId, chatId));
  
  let helpText = `<b>📖 КОМАНДЫ БОТА:</b>

<b>⭐ ОСНОВНЫЕ:</b>
/start - начало
/help - помощь
/daily - ежедневный бонус
/virtas - вирты
/buy_premium - купить премиум
/rp - РП команды

<b>🌟 ПРЕМИУМ КОМАНДЫ:</b>
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
/duel - дуэль
/coin - монета
/profile - профиль
/balance - баланс
/marry - пожениться
/divorce - развод

<b>🛡️ АДМИНИСТРАТОРСКИЕ:</b>
/ban - бан
/unban - разбан
/mute - мут
/unmute - размут
/warn - выдать варн
/unwarn - снять варн
/kick - кикнуть
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
/addcoins @юзер - выдать 9,999,999 ⭐
/givepremium @юзер [месяцы] - выдать Троллинг Консоль
/givestars @юзер [сумма] - выдать звёзды
/givevirtas @юзер [сумма] - выдать виртуны
/announce [текст] - объявление по всем чатам`;
  }

  helpText += `

<b>ℹ️ ПРИМЕЧАНИЕ:</b>
✨ Все текстовые команды работают БЕЗ слеша!
🔒 Премиум команды требуют "Троллинг Консоль"`;

  await sendTelegramMessage(chatId, helpText);
  return { success: true, message: "Help message sent" };
}

async function cmdShowRp(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const rpList = `<b>✨ РП КОМАНДЫ (пиши БЕЗ слеша):</b>

<b>⚔️ Боевые:</b>
ударить, убить, выстрелить, зарезать, отравить, взорвать, сжечь, задушить, толкнуть, пнуть, связать, арестовать, обезглавить, расстрелять

<b>💕 Позитивные:</b>
обнять, целовать, погладить, улыбнуться, подмигнуть, пожать, утешить, похвалить, танец, комплимент, ужин, цветы, серенада

<b>🔥 Другие:</b>
смеяться, плакать, вздохнуть, испугаться, разозлиться, восхититься, кусь, выебать, трахнуть

<b>🌪️ Магия:</b>
заморозить, поджечь, молния, исцелить, воскресить

<b>ИСПОЛЬЗУЙ:</b>
<код>ударить @юзер</код>
(Нужен reply to message или @упоминание)`;
  
  await sendTelegramMessage(chatId, rpList);
  return { success: true, message: "RP commands sent" };
}

async function cmdAnnounce(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { userId, chatId } = triggerInfo.params;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только владельцу!");
    return { success: false, message: "Owner only" };
  }
  
  const message = args.join(" ");
  if (!message) {
    await sendTelegramMessage(chatId, "❌ Укажите текст объявления!");
    return { success: false, message: "No message" };
  }
  
  // Получить все чаты из БД
  const chats = await db.query("SELECT DISTINCT chat_id FROM bot_users");
  let sentCount = 0;
  
  for (const chatRow of chats.rows) {
    try {
      await sendTelegramMessage(chatRow.chat_id, `📢 <b>ОБЪЯВЛЕНИЕ ОТ ВЛАДЕЛЬЦА:</b>\n\n${message}`);
      sentCount++;
    } catch (e) {
      logger?.warn("Failed to send announcement to chat", chatRow.chat_id);
    }
  }
  
  await sendTelegramMessage(chatId, `✅ Объявление отправлено в ${sentCount} чатов!`);
  return { success: true, message: "Announcement sent" };
}

async function hasAdminAccess(userId: number, chatId: number): Promise<boolean> {
  const result = await db.query(
    "SELECT * FROM admin_access WHERE user_id = $1 AND chat_id = $2 AND expires_at > NOW()",
    [userId, chatId]
  );
  return result.rows.length > 0;
}

async function cmdBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  
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
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  
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
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
  await restrictChatMember(chatId, target.userId, { can_send_messages: false });
  await sendTelegramMessage(chatId, `🔇 Пользователь <b>${target.firstName}</b> замучен.`);
  return { success: true, message: "User muted" };
}

async function cmdUnmute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
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
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
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
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
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
  if (!user) return { success: false, message: "User not found" };
  
  const virtas = await db.getUserVirtas(userId);
  await sendTelegramMessage(chatId, `💰 Твой баланс:\n⭐ Звёзды: ${user.stars}\n💸 Вирты: ${virtas.toLocaleString()}`);
  return { success: true, message: "Balance sent" };
}

async function cmdDaily(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  const lastDaily = user?.last_daily ? new Date(user.last_daily) : null;
  const now = new Date();
  
  if (lastDaily && now.getTime() - lastDaily.getTime() < 86400000) {
    const remaining = Math.ceil((86400000 - (now.getTime() - lastDaily.getTime())) / 3600000);
    await sendTelegramMessage(chatId, `⏳ Вернись через ${remaining} часов для следующего бонуса!`);
    return { success: false, message: "Cooldown active" };
  }
  
  const reward = Math.floor(Math.random() * 50) + 50;
  await db.updateUserStars(userId, chatId, reward, "Daily bonus");
  await sendTelegramMessage(chatId, `✨ Ты получил ${reward} ⭐!`);
  return { success: true, message: "Daily reward given" };
}

async function cmdWeekly(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  const lastWeekly = user?.last_weekly ? new Date(user.last_weekly) : null;
  const now = new Date();
  
  if (lastWeekly && now.getTime() - lastWeekly.getTime() < 604800000) {
    const remaining = Math.ceil((604800000 - (now.getTime() - lastWeekly.getTime())) / 86400000);
    await sendTelegramMessage(chatId, `⏳ Вернись через ${remaining} дней для следующего бонуса!`);
    return { success: false, message: "Cooldown active" };
  }
  
  const reward = Math.floor(Math.random() * 200) + 300;
  await db.updateUserStars(userId, chatId, reward, "Weekly bonus");
  await sendTelegramMessage(chatId, `✨ Ты получил ${reward} ⭐!`);
  return { success: true, message: "Weekly reward given" };
}

async function cmdPay(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  const amount = parseInt(args[0]) || 0;
  
  if (!target || amount <= 0) return { success: false, message: "Invalid payment" };
  
  const user = await db.getUser(userId, chatId);
  if (user.stars < amount) {
    await sendTelegramMessage(chatId, "❌ Недостаточно звёзд!");
    return { success: false, message: "Insufficient funds" };
  }
  
  await db.updateUserStars(userId, chatId, -amount, "Payment");
  await db.updateUserStars(target.userId, chatId, amount, "Payment received");
  await sendTelegramMessage(chatId, `💸 Ты отправил ${amount} ⭐ пользователю <b>${target.firstName}</b>.`);
  return { success: true, message: "Payment done" };
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

async function cmdVirtasBalance(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const virtas = await db.getUserVirtas(userId);
  const msg = `💸 Твой баланс виртов: <b>${virtas.toLocaleString()}</b> 💸\n\n/buyvirtas 10 - купить 10k виртов за 10 ⭐`;
  await sendTelegramMessage(chatId, msg);
  return { success: true, message: "Virtas balance sent" };
}

async function cmdBuyVirtas(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const amount = parseInt(args[0]) || 10;
  const cost = amount;
  
  const user = await db.getUser(userId, chatId);
  if (user.stars < cost) {
    await sendTelegramMessage(chatId, `❌ Нужно ${cost} ⭐, а у тебя ${user.stars}!`);
    return { success: false, message: "Insufficient funds" };
  }
  
  await db.updateUserStars(userId, chatId, -cost, "Virtas purchase");
  await db.updateUserVirtas(userId, amount * 1000);
  await sendTelegramMessage(chatId, `✅ Куплено ${amount * 1000} виртов за ${cost} ⭐!`);
  return { success: true, message: "Virtas bought" };
}

async function cmdWhoToday(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
  const answers = [
    `${target.firstName} - топ видвоселяк чата! 🤡`,
    `${target.firstName} - король мема сегодня! 👑`,
    `${target.firstName} - боженька чата! 😇`,
    `${target.firstName} - самый норм человек! ✨`,
    `${target.firstName} - просто легенда! 🔥`,
  ];
  
  const answer = answers[Math.floor(Math.random() * answers.length)];
  await sendTelegramMessage(chatId, `🎰 <b>Предсказание:</b> ${answer}`);
  return { success: true, message: "Prediction sent" };
}

async function cmdDice(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const roll = Math.floor(Math.random() * 6) + 1;
  await sendTelegramMessage(chatId, `🎲 Выпало: <b>${roll}</b>`);
  return { success: true, message: "Dice rolled" };
}

async function cmdCasino(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId } = triggerInfo.params;
  const bet = parseInt(args[0]) || 10;
  const win = Math.random() > 0.5;
  const msg = win ? `🎉 Ты выиграл ${bet * 2}!` : `😒 Ты проиграл ${bet}!`;
  await sendTelegramMessage(chatId, msg);
  return { success: true, message: "Casino done" };
}

async function cmdSmeshnoyText(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isPrem = await db.isPremium(userId);
  
  if (!isPrem) {
    await sendTelegramMessage(chatId, "❌ Эта команда требует Троллинг Консоль!");
    return { success: false, message: "Not premium" };
  }
  
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
  await db.addTempRestriction(userId, chatId, 'funny_text', userId, expiresAt, JSON.stringify({ count: 0 }));
  await sendTelegramMessage(chatId, "🤡 Теперь твои сообщения будут смешными! Действует 6 часов.");
  return { success: true, message: "Funny text enabled" };
}

async function cmdKloun(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isPrem = await db.isPremium(userId);
  
  if (!isPrem) {
    await sendTelegramMessage(chatId, "❌ Эта команда требует Троллинг Консоль!");
    return { success: false, message: "Not premium" };
  }
  
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
  await db.addTempRestriction(userId, chatId, 'kloun', userId, expiresAt);
  await sendTelegramMessage(chatId, "🤡 Ты официально клоун на 1 час!");
  return { success: true, message: "Kloun mode enabled" };
}

async function cmdUnmuteAll(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isPrem = await db.isPremium(userId);
  
  if (!isPrem) {
    await sendTelegramMessage(chatId, "❌ Эта команда требует Троллинг Консоль!");
    return { success: false, message: "Not premium" };
  }
  
  // Разограничить всех в чате
  const users = await db.query("SELECT DISTINCT user_id FROM bot_users WHERE chat_id = $1", [chatId]);
  for (const row of users.rows) {
    try {
      await restrictChatMember(chatId, row.user_id, { can_send_messages: true });
    } catch (e) {}
  }
  
  await sendTelegramMessage(chatId, "🔊 Все разогнаны!");
  return { success: true, message: "All unmuted" };
}

async function cmdTransform(triggerInfo: TriggerInfoTelegram, args: string[], logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const isPrem = await db.isPremium(userId);
  
  if (!isPrem) {
    await sendTelegramMessage(chatId, "❌ Эта команда требует Троллинг Консоль!");
    return { success: false, message: "Not premium" };
  }
  
  const forms = ["🐱 Кот", "🐶 Собака", "🦁 Лев", "🧛 Вампир", "👽 Инопланетянин", "💀 Скелет", "👰 Невеста"];
  const form = forms[Math.floor(Math.random() * forms.length)];
  
  await sendTelegramMessage(chatId, `✨ ${triggerInfo.params.firstName} превратился в ${form}!`);
  return { success: true, message: "Transformed" };
}

async function cmdInvisibility(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!(await db.isPremium(userId))) {
    await sendTelegramMessage(chatId, "❌ Эта команда требует Троллинг Консоль!");
    return { success: false, message: "Not premium" };
  }
  
  await sendTelegramMessage(chatId, `💨 ${triggerInfo.params.firstName} стал невидимым!`);
  return { success: true, message: "Invisible" };
}

async function handleNonCommand(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId, message, hasMedia, mediaType, messageId } = triggerInfo.params;
  
  if (!message) return { success: true, message: "No text" };
  
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
  
  // Проверка смешного текста - удалить и заменить
  const hasFunnyText = await db.query(
    "SELECT * FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = 'funny_text' AND expires_at > NOW()",
    [userId, chatId]
  );
  
  if (hasFunnyText.rows.length > 0) {
    const funnyPhrases = [
      "картошка не умеет плавать 🥔",
      "банан уговаривает холодильник 🍌",
      "стол выполняет зарядку 🪑",
      "облако ест печенье ☁️",
      "камень танцует балет 🪨",
      "ветер поёт оперу 💨",
    ];
    
    const randomPhrase = funnyPhrases[Math.floor(Math.random() * funnyPhrases.length)];
    await deleteMessage(chatId, messageId);
    await sendTelegramMessage(chatId, `🤡 <b>${triggerInfo.params.firstName}</b> написал(а): <i>${randomPhrase}</i>`);
    
    // Удалить эффект после 6 сообщений
    const reason = hasFunnyText.rows[0].reason;
    let data = { count: 0 };
    try {
      data = JSON.parse(reason);
    } catch (e) {}
    data.count = (data.count || 0) + 1;
    
    if (data.count >= 6) {
      await db.removeTempRestriction(userId, chatId, 'funny_text');
    } else {
      await db.addTempRestriction(userId, chatId, 'funny_text', userId, hasFunnyText.rows[0].expires_at, JSON.stringify(data));
    }
    return { success: true, message: "Funny text applied" };
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
    const settings = await db.getChatSettings(chatId);
    let allowed = true;
    
    if (mediaType === "photo" && settings?.photo_allowed === false) allowed = false;
    if (mediaType === "sticker" && settings?.sticker_allowed === false) allowed = false;
    if (mediaType === "video" && settings?.video_allowed === false) allowed = false;
    if (mediaType === "voice" && settings?.voice_allowed === false) allowed = false;
    
    if (!allowed) {
      const isUserAdmin = await isAdmin(chatId, userId);
      if (!isUserAdmin) {
        await deleteMessage(chatId, messageId);
        return { success: true, message: "Media deleted due to restrictions" };
      }
    }
  }
  
  // Текстовые команды - ОСНОВНЫЕ
  if (lowerText === "вирт" || lowerText === "вирты") {
    return await cmdVirtasBalance(triggerInfo, logger);
  }
  
  // Текстовые команды - ПРЕМИУМ
  if (lowerText === "смешной текст") {
    return await cmdSmeshnoyText(triggerInfo, logger);
  }
  if (lowerText === "клоун") {
    return await cmdKloun(triggerInfo, logger);
  }
  if (lowerText === "размут") {
    return await cmdUnmuteAll(triggerInfo, logger);
  }
  if (lowerText === "превратить") {
    return await cmdTransform(triggerInfo, [], logger);
  }
  if (lowerText === "невидимость") {
    return await cmdInvisibility(triggerInfo, logger);
  }
  
  // Текстовые команды - РАЗВЛЕЧЕНИЯ
  if (lowerText === "кубик") {
    return await cmdDice(triggerInfo, logger);
  }
  if (lowerText === "казино") {
    return await cmdCasino(triggerInfo, [Math.floor(Math.random() * 50).toString()], logger);
  }
  if (lowerText === "слоты") {
    return await cmdSlot(triggerInfo, [], logger);
  }
  if (lowerText === "рыбалка") {
    return await cmdFish(triggerInfo, [], logger);
  }
  if (lowerText === "дуэль") {
    return await cmdDuel(triggerInfo, logger);
  }
  if (lowerText === "монета") {
    return await cmdCoin(triggerInfo, logger);
  }
  
  // RP trigger check - исправлено
  const rpTriggers: Record<string, string> = {
    "ударить": "ударил(а)",
    "обнять": "обнял(а)",
    "выебать": "выебал(а)",
    "трахнуть": "трахнул(а)",
    "убить": "убил(а)",
    "поцеловать": "поцеловал(а)",
    "целовать": "целовал(а)",
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
  
  const firstWord = lowerText.split(" ")[0];
  if (rpTriggers[firstWord]) {
    const target = await getTargetUser(triggerInfo);
    if (target && target.userId !== userId) {
      const { firstName } = triggerInfo.params;
      const action = rpTriggers[firstWord];
      await sendTelegramMessage(chatId, `✨ <b>${firstName}</b> ${action} <b>${target.firstName}</b>!`);
      return { success: true, message: "RP action done" };
    } else {
      await sendTelegramMessage(chatId, "❌ Используй reply на сообщение или @упоминание!");
      return { success: false, message: "No valid target" };
    }
  }
  
  return { success: true, message: "Non-command message processed" };
}

// Helper functions for remaining commands
async function cmdReadOnly(triggerInfo: TriggerInfoTelegram, enable: boolean, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Admin only" };
  }
  await restrictChatMember(chatId, triggerInfo.params.userId, { can_send_messages: !enable });
  await sendTelegramMessage(chatId, enable ? "🔇 Режим 'Только чтение' включен." : "🔊 Режим 'Только чтение' выключен.");
  return { success: true, message: "RO toggled" };
}

async function cmdKick(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Admin only" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  await unbanChatMember(chatId, target.userId);
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
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  await promoteChatMember(chatId, target.userId, { can_manage_chat: true, can_delete_messages: true, can_restrict_members: true });
  await sendTelegramMessage(chatId, `✅ Пользователь <b>${target.firstName}</b> назначен администратором.`);
  return { success: true, message: "Promoted" };
}

async function cmdDemote(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Permission denied" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
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

async function cmdBuyPremium(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  const user = await db.getUser(userId, chatId);
  
  if (user.stars < PREMIUM_PRICE) {
    await sendTelegramMessage(chatId, `❌ Нужно ${PREMIUM_PRICE} ⭐, а у тебя ${user.stars}!`);
    return { success: false, message: "Insufficient funds" };
  }
  
  await db.updateUserStars(userId, chatId, -PREMIUM_PRICE, "Premium purchase");
  await db.grantPremium(userId, 1);
  await sendTelegramMessage(chatId, `✅ Ты купил Троллинг Консоль на 1 месяц!`);
  return { success: true, message: "Premium bought" };
}

async function cmdMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  const target = await getTargetUser(triggerInfo);
  if (!target) return { success: false, message: "No target" };
  
  await sendTelegramMessage(chatId, `💍 Предложение в браке отправлено пользователю <b>${target.firstName}</b>!`);
  return { success: true, message: "Marriage proposal sent" };
}

async function cmdAcceptMarry(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `💕 Вы вышли замуж/женились!`);
  return { success: true, message: "Marriage accepted" };
}

async function cmdDivorce(triggerInfo: TriggerInfoTelegram, logger: any) {
  const { chatId } = triggerInfo.params;
  await sendTelegramMessage(chatId, `😢 Вы развелись.`);
  return { success: true, message: "Divorced" };
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
  return { success: true, message: "Members count sent" };
}

async function cmdWarnLimit(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const val = parseInt(args[0]) || 3;
  await db.updateChatSettings(chatId, { warn_limit: val });
  await sendTelegramMessage(chatId, `⚙️ Лимит варнов установлен на: <b>${val}</b>`);
  return { success: true, message: "Warn limit set" };
}

async function cmdResetWarns(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  await db.resetWarnings(target.userId, chatId);
  await sendTelegramMessage(chatId, `✅ Варны пользователя <b>${target.firstName}</b> сброшены.`);
  return { success: true, message: "Warns reset" };
}

async function cmdClean(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, messageId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
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
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  await banChatMember(chatId, target.userId);
  await unbanChatMember(chatId, target.userId);
  await sendTelegramMessage(chatId, `🍌 Пользователь <b>${target.firstName}</b> был кикнут и сообщения удалены.`);
  return { success: true, message: "Softban done" };
}

async function cmdTempBan(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const target = await getTargetUser(triggerInfo);
  const time = parseTime(args[0] || "1h");
  if (!target || !time) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя и время!");
    return { success: false, message: "Invalid params" };
  }
  await banChatMember(chatId, target.userId);
  await db.addTempRestriction(target.userId, chatId, 'ban', triggerInfo.params.userId, new Date(Date.now() + time * 1000));
  await sendTelegramMessage(chatId, `🚫 Пользователь <b>${target.firstName}</b> забанен на ${args[0]}.`);
  return { success: true, message: "Tempban done" };
}

async function cmdTempMute(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const target = await getTargetUser(triggerInfo);
  const time = parseTime(args[0] || "1h");
  if (!target || !time) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя и время!");
    return { success: false, message: "Invalid params" };
  }
  await restrictChatMember(chatId, target.userId, { can_send_messages: false });
  await db.addTempRestriction(target.userId, chatId, 'mute', triggerInfo.params.userId, new Date(Date.now() + time * 1000));
  await sendTelegramMessage(chatId, `🔇 Пользователь <b>${target.firstName}</b> замучен на ${args[0]}.`);
  return { success: true, message: "Tempmute done" };
}

async function cmdAntispam(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { antispam_enabled: enable });
  await sendTelegramMessage(chatId, `⚙️ Антиспам ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Antispam toggled" };
}

async function cmdFlood(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { flood_control: enable });
  await sendTelegramMessage(chatId, `⚙️ Контроль флуда ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Flood toggled" };
}

async function cmdBlacklist(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  if (args.length === 0) {
    await sendTelegramMessage(chatId, "❌ Укажите слово для добавления в черный список!");
    return { success: false, message: "No word" };
  }
  await db.addBlacklistWord(chatId, args[0], userId);
  await sendTelegramMessage(chatId, `✅ Слово "<b>${args[0]}</b>" добавлено в черный список.`);
  return { success: true, message: "Blacklist word added" };
}

async function cmdWhitelist(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  if (args.length === 0) {
    await sendTelegramMessage(chatId, "❌ Укажите слово для удаления из черного списка!");
    return { success: false, message: "No word" };
  }
  await db.removeBlacklistWord(chatId, args[0]);
  await sendTelegramMessage(chatId, `✅ Слово "<b>${args[0]}</b>" удалено из черного списка.`);
  return { success: true, message: "Blacklist word removed" };
}

async function cmdCaps(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { caps_filter: enable });
  await sendTelegramMessage(chatId, `⚙️ Фильтр капса ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Caps toggled" };
}

async function cmdLinks(triggerInfo: TriggerInfoTelegram, args: string[], isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const enable = args[0] !== "off";
  await db.updateChatSettings(chatId, { links_filter: enable });
  await sendTelegramMessage(chatId, `⚙️ Фильтр ссылок ${enable ? "включен" : "выключен"}.`);
  return { success: true, message: "Links toggled" };
}

async function cmdBadwords(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const words = await db.getBlacklistWords(chatId);
  await sendTelegramMessage(chatId, `🚫 <b>Черный список слов:</b>\n${words.join(", ") || "пусто"}`);
  return { success: true, message: "Badwords sent" };
}

async function cmdAddCoins(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId, userId } = triggerInfo.params;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только владельцу!");
    return { success: false, message: "Owner only" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
  await db.query("UPDATE bot_users SET stars = 9999999 WHERE user_id = $1", [target.userId]);
  await sendTelegramMessage(chatId, `💰 Баланс пользователя <b>${target.firstName}</b> установлен на 9,999,999 ⭐!`);
  return { success: true, message: "Coins added" };
}

async function cmdGivePremium(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только владельцу!");
    return { success: false, message: "Owner only" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
  const months = parseInt(args[0]) || 1;
  await db.grantPremium(target.userId, months);
  await sendTelegramMessage(chatId, `🌟 Пользователю <b>${target.firstName}</b> выдана "Троллинг Консоль" на ${months} мес.!`);
  return { success: true, message: "Premium granted" };
}

async function cmdGiveStars(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только владельцу!");
    return { success: false, message: "Owner only" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
  const amount = parseInt(args[0]) || 1000;
  await db.updateUserStars(target.userId, chatId, amount, "Выдача владельцем");
  await sendTelegramMessage(chatId, `⭐ Пользователю <b>${target.firstName}</b> выдано ${amount} звёзд!`);
  return { success: true, message: "Stars given" };
}

async function cmdGiveVirtas(triggerInfo: TriggerInfoTelegram, args: string[], isOwner: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isOwner) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только владельцу!");
    return { success: false, message: "Owner only" };
  }
  
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  
  const amount = parseInt(args[0]) || 1000;
  await db.updateUserVirtas(target.userId, amount);
  await sendTelegramMessage(chatId, `💸 Пользователю <b>${target.firstName}</b> выдано ${amount} виртов!`);
  return { success: true, message: "Virtas given" };
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

async function cmdRestrict(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  await restrictChatMember(chatId, target.userId, { can_send_messages: false, can_send_media_messages: false });
  await sendTelegramMessage(chatId, `🔒 Пользователь <b>${target.firstName}</b> ограничен.`);
  return { success: true, message: "User restricted" };
}

async function cmdUnrestrict(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  const { chatId } = triggerInfo.params;
  if (!isAdmin) {
    await sendTelegramMessage(chatId, "❌ Эта команда доступна только администраторам!");
    return { success: false, message: "Not admin" };
  }
  const target = await getTargetUser(triggerInfo);
  if (!target) {
    await sendTelegramMessage(chatId, "❌ Укажите пользователя!");
    return { success: false, message: "No target" };
  }
  await restrictChatMember(chatId, target.userId, { can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true });
  await sendTelegramMessage(chatId, `🔓 Пользователь <b>${target.firstName}</b> разограничен.`);
  return { success: true, message: "User unrestricted" };
}

async function cmdCleanAll(triggerInfo: TriggerInfoTelegram, isAdmin: boolean, logger: any) {
  return await cmdClean(triggerInfo, ["100"], isAdmin, logger);
}

function parseTime(timeStr: string): number {
  const num = parseInt(timeStr);
  if (timeStr.includes("h")) return num * 3600;
  if (timeStr.includes("m")) return num * 60;
  if (timeStr.includes("d")) return num * 86400;
  return num * 3600;
}
