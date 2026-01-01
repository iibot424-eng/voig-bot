import type { ContentfulStatusCode } from "hono/utils/http-status";

import { registerApiRoute } from "../mastra/inngest";
import { Mastra } from "@mastra/core";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn(
    "Trying to initialize Telegram triggers without TELEGRAM_BOT_TOKEN. Can you confirm that the Telegram integration is configured correctly?",
  );
}

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  reply_to_message?: TelegramMessage;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  photo?: any[];
  video?: any;
  audio?: any;
  voice?: any;
  sticker?: any;
  document?: any;
  animation?: any;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
    user?: TelegramUser;
  }>;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
};

export type TriggerInfoTelegram = {
  type: string;
  params: {
    userId: number;
    chatId: number;
    userName: string;
    firstName: string;
    lastName?: string;
    message: string;
    messageId: number;
    isCommand: boolean;
    command?: string;
    commandArgs?: string[];
    replyToMessage?: TelegramMessage;
    isCallback: boolean;
    callbackData?: string;
    callbackId?: string;
    newMembers?: TelegramUser[];
    leftMember?: TelegramUser;
    hasMedia: boolean;
    mediaType?: string;
    isForwarded: boolean;
    hasLinks: boolean;
    mentionedUsers: TelegramUser[];
    chatType: string;
    chatTitle?: string;
  };
  payload: any;
};

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyToMessageId?: number;
    replyMarkup?: any;
    disablePreview?: boolean;
  }
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || "HTML",
      reply_to_message_id: options?.replyToMessageId,
      reply_markup: options?.replyMarkup,
      disable_web_page_preview: options?.disablePreview,
    }),
  });
  return response.json();
}

export async function answerCallback(
  callbackId: string,
  text?: string,
  showAlert?: boolean
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
      show_alert: showAlert,
    }),
  });
  return response.json();
}

export async function banChatMember(
  chatId: number,
  userId: number,
  untilDate?: number
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/banChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      until_date: untilDate,
    }),
  });
  return response.json();
}

export async function unbanChatMember(
  chatId: number,
  userId: number,
  onlyIfBanned?: boolean
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/unbanChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      only_if_banned: onlyIfBanned,
    }),
  });
  return response.json();
}

export async function restrictChatMember(
  chatId: number,
  userId: number,
  permissions: {
    can_send_messages?: boolean;
    can_send_media_messages?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
  },
  untilDate?: number
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/restrictChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      permissions,
      until_date: untilDate,
    }),
  });
  return response.json();
}

export async function promoteChatMember(
  chatId: number,
  userId: number,
  options?: {
    can_manage_chat?: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_delete_messages?: boolean;
    can_manage_video_chats?: boolean;
    can_restrict_members?: boolean;
    can_promote_members?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
  }
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/promoteChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      ...options,
    }),
  });
  return response.json();
}

export async function getChatMember(
  chatId: number,
  userId: number
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/getChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
    }),
  });
  return response.json();
}

export async function getChatAdministrators(chatId: number): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/getChatAdministrators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  });
  return response.json();
}

export async function getChatMembersCount(chatId: number): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/getChatMemberCount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  });
  return response.json();
}

export async function deleteMessage(
  chatId: number,
  messageId: number
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
  return response.json();
}

export async function pinChatMessage(
  chatId: number,
  messageId: number,
  disableNotification?: boolean
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/pinChatMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      disable_notification: disableNotification,
    }),
  });
  return response.json();
}

export async function unpinChatMessage(
  chatId: number,
  messageId?: number
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/unpinChatMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
  return response.json();
}

export async function getChat(chatId: number): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  });
  return response.json();
}

export async function exportChatInviteLink(chatId: number): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/exportChatInviteLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  });
  return response.json();
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyMarkup?: any;
  }
): Promise<any> {
  const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parseMode || "HTML",
      reply_markup: options?.replyMarkup,
    }),
  });
  return response.json();
}

function parseMessage(payload: any): TriggerInfoTelegram {
  const message: TelegramMessage = payload.message || payload.edited_message;
  const callbackQuery: TelegramCallbackQuery = payload.callback_query;
  
  if (callbackQuery) {
    const cbMessage = callbackQuery.message;
    return {
      type: "telegram/callback",
      params: {
        userId: callbackQuery.from.id,
        chatId: cbMessage?.chat.id || 0,
        userName: callbackQuery.from.username || "",
        firstName: callbackQuery.from.first_name,
        lastName: callbackQuery.from.last_name,
        message: cbMessage?.text || "",
        messageId: cbMessage?.message_id || 0,
        isCommand: false,
        isCallback: true,
        callbackData: callbackQuery.data,
        callbackId: callbackQuery.id,
        hasMedia: false,
        isForwarded: false,
        hasLinks: false,
        mentionedUsers: [],
        chatType: cbMessage?.chat.type || "private",
        chatTitle: cbMessage?.chat.title,
      },
      payload,
    };
  }

  if (!message) {
    return {
      type: "telegram/unknown",
      params: {
        userId: 0,
        chatId: 0,
        userName: "",
        firstName: "",
        message: "",
        messageId: 0,
        isCommand: false,
        isCallback: false,
        hasMedia: false,
        isForwarded: false,
        hasLinks: false,
        mentionedUsers: [],
        chatType: "private",
      },
      payload,
    };
  }

  const text = message.text || message.caption || "";
  const isCommand = text.startsWith("/");
  let command: string | undefined;
  let commandArgs: string[] | undefined;
  
  if (isCommand) {
    const parts = text.split(" ");
    command = parts[0].substring(1).split("@")[0];
    commandArgs = parts.slice(1);
  }

  const hasLinks = message.entities?.some(e => 
    e.type === "url" || e.type === "text_link"
  ) || false;

  const mentionedUsers: TelegramUser[] = [];
  message.entities?.forEach(e => {
    if (e.type === "text_mention" && e.user) {
      mentionedUsers.push(e.user);
    }
  });

  let mediaType: string | undefined;
  if (message.photo) mediaType = "photo";
  else if (message.video) mediaType = "video";
  else if (message.audio) mediaType = "audio";
  else if (message.voice) mediaType = "voice";
  else if (message.sticker) mediaType = "sticker";
  else if (message.document) mediaType = "document";
  else if (message.animation) mediaType = "animation";

  let eventType = "telegram/message";
  if (message.new_chat_members?.length) {
    eventType = "telegram/new_members";
  } else if (message.left_chat_member) {
    eventType = "telegram/left_member";
  } else if (isCommand) {
    eventType = "telegram/command";
  }

  return {
    type: eventType,
    params: {
      userId: message.from?.id || 0,
      chatId: message.chat.id,
      userName: message.from?.username || "",
      firstName: message.from?.first_name || "",
      lastName: message.from?.last_name,
      message: text,
      messageId: message.message_id,
      isCommand,
      command,
      commandArgs,
      replyToMessage: message.reply_to_message,
      isCallback: false,
      newMembers: message.new_chat_members,
      leftMember: message.left_chat_member,
      hasMedia: !!mediaType,
      mediaType,
      isForwarded: !!(message.forward_from || message.forward_from_chat),
      hasLinks,
      mentionedUsers,
      chatType: message.chat.type,
      chatTitle: message.chat.title,
    },
    payload,
  };
}

async function setupWebhook() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const baseUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (!baseUrl) {
    console.warn("⚠️ [Telegram] APP_URL or RENDER_EXTERNAL_URL is not set. Webhook registration skipped.");
    return;
  }
  const webhookUrl = `${baseUrl}/webhooks/telegram/action`;
  console.log(`📡 Attempting to register Telegram Webhook: ${webhookUrl}`);
  
  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook?url=${webhookUrl}`, {
      method: "POST",
    });
    const result = await response.json();
    if (result.ok) {
      console.log("✅ Telegram Webhook registered successfully");
    } else {
      console.error("❌ Failed to register Telegram Webhook:", result.description);
    }
  } catch (err) {
    console.error("🚨 Network error during webhook registration:", err);
  }
}

export function registerTelegramTrigger({
  triggerType,
  handler,
}: {
  triggerType: string;
  handler: (
    mastra: Mastra,
    triggerInfo: TriggerInfoTelegram,
  ) => Promise<void>;
}) {
  console.log("🛠 Initializing Telegram Trigger...");
  setupWebhook();

  return [
    registerApiRoute("/webhooks/telegram/action", {
      method: "POST",
      handler: async (c) => {
        const mastra = c.get("mastra");
        const logger = mastra.getLogger();
        try {
          const payload = await c.req.json();

          logger?.info("📥 [Telegram] Webhook received", { 
            update_id: payload.update_id,
            has_message: !!payload.message,
            has_callback: !!payload.callback_query 
          });

          const triggerInfo = parseMessage(payload);
          
          logger?.info("📝 [Telegram] Parsed trigger info", { 
            type: triggerInfo.type,
            userId: triggerInfo.params.userId,
            chatId: triggerInfo.params.chatId,
            command: triggerInfo.params.command,
            isCallback: triggerInfo.params.isCallback
          });

          try {
            await handler(mastra, triggerInfo);
          } catch (handlerError: any) {
            logger?.error("❌ [Telegram] Handler execution failed:", { 
              error: handlerError.message,
              stack: handlerError.stack,
              triggerType: triggerInfo.type
            });
            throw handlerError;
          }

          return c.text("OK", 200);
        } catch (error: any) {
          logger?.error("❌ [Telegram] Error handling webhook:", { 
            error: error.message,
            stack: error.stack,
            payload: "See info logs for payload"
          });
          return c.text("Internal Server Error", 500);
        }
      },
    }),
  ];
}
