import pg from "pg";

const pool = new pg.Pool({
  connectionString: "postgresql://neondb_owner:npg_hCTrcD3kIOa5@ep-delicate-art-aiciia6n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
  ssl: {
    rejectUnauthorized: false
  }
});

export async function query(sql: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

export async function getOrCreateUser(
  userId: number,
  chatId: number,
  username?: string,
  firstName?: string,
  lastName?: string
) {
  const existing = await query(
    "SELECT * FROM bot_users WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
  
  if (existing.rows.length > 0) {
    await query(
      "UPDATE bot_users SET username = $3, first_name = $4, last_name = $5, updated_at = NOW() WHERE user_id = $1 AND chat_id = $2",
      [userId, chatId, username, firstName, lastName]
    );
    return existing.rows[0];
  }

  const result = await query(
    `INSERT INTO bot_users (user_id, chat_id, username, first_name, last_name) 
     VALUES ($1, $2, $3, $4, $5) 
     ON CONFLICT (user_id, chat_id) DO UPDATE SET username = $3, first_name = $4, last_name = $5
     RETURNING *`,
    [userId, chatId, username, firstName, lastName]
  );
  return result.rows[0];
}

export async function getUser(userId: number, chatId: number) {
  const result = await query(
    "SELECT * FROM bot_users WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
  return result.rows[0];
}

export async function updateUserStars(userId: number, chatId: number, amount: number, description: string) {
  await query(
    "UPDATE bot_users SET stars = stars + $3 WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, amount]
  );
  await query(
    "INSERT INTO star_transactions (user_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4)",
    [userId, amount, amount > 0 ? "credit" : "debit", description]
  );
}

export async function getUserStars(userId: number, chatId: number): Promise<number> {
  const result = await query(
    "SELECT stars FROM bot_users WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
  return result.rows[0]?.stars || 0;
}

export async function getOrCreateChat(
  chatId: number,
  chatTitle?: string,
  chatType?: string,
  ownerId?: number
) {
  const existing = await query(
    "SELECT * FROM bot_chats WHERE chat_id = $1",
    [chatId]
  );
  
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const result = await query(
    `INSERT INTO bot_chats (chat_id, chat_title, chat_type, owner_id) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (chat_id) DO UPDATE SET chat_title = $2
     RETURNING *`,
    [chatId, chatTitle, chatType, ownerId]
  );
  return result.rows[0];
}

export async function getChatSettings(chatId: number) {
  const result = await query(
    "SELECT * FROM bot_chats WHERE chat_id = $1",
    [chatId]
  );
  return result.rows[0];
}

export async function updateChatSettings(chatId: number, settings: Record<string, any>) {
  const setClauses = Object.keys(settings).map((key, i) => `${key} = $${i + 2}`);
  const values = [chatId, ...Object.values(settings)];
  
  try {
    await query(
      `UPDATE bot_chats SET ${setClauses.join(", ")}, updated_at = NOW() WHERE chat_id = $1`,
      values
    );
  } catch (err) {
    console.error("❌ [DB] updateChatSettings error:", err, { chatId, settings });
    throw err;
  }
}

export async function addWarning(
  userId: number,
  chatId: number,
  adminId: number,
  reason?: string
): Promise<number> {
  await query(
    "INSERT INTO warnings (user_id, chat_id, admin_id, reason) VALUES ($1, $2, $3, $4)",
    [userId, chatId, adminId, reason]
  );
  
  const count = await query(
    "SELECT COUNT(*) as count FROM warnings WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
  return parseInt(count.rows[0].count);
}

export async function getWarnings(userId: number, chatId: number) {
  const result = await query(
    "SELECT * FROM warnings WHERE user_id = $1 AND chat_id = $2 ORDER BY created_at DESC",
    [userId, chatId]
  );
  return result.rows;
}

export async function getWarningCount(userId: number, chatId: number): Promise<number> {
  const result = await query(
    "SELECT COUNT(*) as count FROM warnings WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
  return parseInt(result.rows[0].count);
}

export async function removeWarning(userId: number, chatId: number): Promise<boolean> {
  const result = await query(
    "DELETE FROM warnings WHERE id = (SELECT id FROM warnings WHERE user_id = $1 AND chat_id = $2 ORDER BY created_at DESC LIMIT 1) RETURNING id",
    [userId, chatId]
  );
  return result.rowCount > 0;
}

export async function resetWarnings(userId: number, chatId: number) {
  await query(
    "DELETE FROM warnings WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
}

export async function addTempRestriction(
  userId: number,
  chatId: number,
  restrictionType: string,
  adminId: number,
  expiresAt: Date,
  reason?: string
) {
  await query(
    `INSERT INTO temp_restrictions (user_id, chat_id, restriction_type, admin_id, expires_at, reason) 
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, chat_id, restriction_type) DO UPDATE SET expires_at = $5, reason = $6`,
    [userId, chatId, restrictionType, adminId, expiresAt, reason]
  );
}

export async function removeTempRestriction(userId: number, chatId: number, restrictionType: string) {
  await query(
    "DELETE FROM temp_restrictions WHERE user_id = $1 AND chat_id = $2 AND restriction_type = $3",
    [userId, chatId, restrictionType]
  );
}

export async function getExpiredRestrictions() {
  const result = await query(
    "SELECT * FROM temp_restrictions WHERE expires_at <= NOW()"
  );
  return result.rows;
}

export async function addBlacklistWord(chatId: number, word: string, addedBy: number) {
  await query(
    "INSERT INTO blacklist_words (chat_id, word, added_by) VALUES ($1, $2, $3) ON CONFLICT (chat_id, word) DO NOTHING",
    [chatId, word.toLowerCase(), addedBy]
  );
}

export async function removeBlacklistWord(chatId: number, word: string) {
  await query(
    "DELETE FROM blacklist_words WHERE chat_id = $1 AND word = $2",
    [chatId, word.toLowerCase()]
  );
}

export async function getBlacklistWords(chatId: number): Promise<string[]> {
  const result = await query(
    "SELECT word FROM blacklist_words WHERE chat_id = $1",
    [chatId]
  );
  return result.rows.map((r: any) => r.word);
}

export async function updateReputation(
  userId: number,
  chatId: number,
  fromUserId: number,
  change: number,
  reason?: string
) {
  await query(
    "UPDATE bot_users SET reputation = reputation + $3 WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, change]
  );
  await query(
    "INSERT INTO reputation_history (user_id, chat_id, from_user_id, change, reason) VALUES ($1, $2, $3, $4, $5)",
    [userId, chatId, fromUserId, change, reason]
  );
}

export async function getReputation(userId: number, chatId: number): Promise<number> {
  const result = await query(
    "SELECT reputation FROM bot_users WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
  return result.rows[0]?.reputation || 0;
}

export async function canGiveReputation(fromUserId: number, toUserId: number, chatId: number): Promise<boolean> {
  const result = await query(
    `SELECT created_at FROM reputation_history 
     WHERE from_user_id = $1 AND user_id = $2 AND chat_id = $3 
     AND created_at > NOW() - INTERVAL '24 hours'`,
    [fromUserId, toUserId, chatId]
  );
  return result.rows.length === 0;
}

export async function setAfk(userId: number, chatId: number, reason?: string) {
  await query(
    "UPDATE bot_users SET is_afk = TRUE, afk_reason = $3, afk_since = NOW() WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, reason]
  );
}

export async function removeAfk(userId: number, chatId: number) {
  await query(
    "UPDATE bot_users SET is_afk = FALSE, afk_reason = NULL, afk_since = NULL WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
}

export async function getAfkUsers(chatId: number, userIds: number[]) {
  if (userIds.length === 0) return [];
  const result = await query(
    `SELECT user_id, username, first_name, afk_reason, afk_since 
     FROM bot_users 
     WHERE chat_id = $1 AND user_id = ANY($2) AND is_afk = TRUE`,
    [chatId, userIds]
  );
  return result.rows;
}

export async function updateMessageStats(userId: number, chatId: number) {
  await query(
    `INSERT INTO message_stats (user_id, chat_id, date, message_count) 
     VALUES ($1, $2, CURRENT_DATE, 1)
     ON CONFLICT (user_id, chat_id, date) DO UPDATE SET message_count = message_stats.message_count + 1`,
    [userId, chatId]
  );
  await query(
    "UPDATE bot_users SET message_count = message_count + 1, xp = xp + 1 WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
}

export async function getTopActive(chatId: number, limit: number = 10) {
  const result = await query(
    `SELECT user_id, username, first_name, message_count, level, reputation, stars
     FROM bot_users 
     WHERE chat_id = $1 
     ORDER BY message_count DESC 
     LIMIT $2`,
    [chatId, limit]
  );
  return result.rows;
}

export async function getTopReputation(chatId: number, limit: number = 10) {
  const result = await query(
    `SELECT user_id, username, first_name, reputation 
     FROM bot_users 
     WHERE chat_id = $1 
     ORDER BY reputation DESC 
     LIMIT $2`,
    [chatId, limit]
  );
  return result.rows;
}

export async function getTopWarns(chatId: number, limit: number = 10) {
  const result = await query(
    `SELECT w.user_id, u.username, u.first_name, COUNT(*) as warn_count
     FROM warnings w
     LEFT JOIN bot_users u ON w.user_id = u.user_id AND w.chat_id = u.chat_id
     WHERE w.chat_id = $1
     GROUP BY w.user_id, u.username, u.first_name
     ORDER BY warn_count DESC
     LIMIT $2`,
    [chatId, limit]
  );
  return result.rows;
}

export async function claimDailyBonus(userId: number, chatId: number): Promise<{ success: boolean; amount: number; message: string }> {
  const user = await getUser(userId, chatId);
  if (!user) {
    return { success: false, amount: 0, message: "Пользователь не найден" };
  }
  
  const lastBonus = user.last_bonus;
  const now = new Date();
  
  if (lastBonus) {
    const lastDate = new Date(lastBonus);
    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      const hoursLeft = Math.ceil(24 - hoursDiff);
      return { 
        success: false, 
        amount: 0, 
        message: `Бонус можно получить через ${hoursLeft} ч.` 
      };
    }
  }
  
  const bonusAmount = 50 + Math.floor(Math.random() * 51);
  
  await query(
    "UPDATE bot_users SET stars = stars + $3, last_bonus = NOW() WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, bonusAmount]
  );
  await query(
    "INSERT INTO star_transactions (user_id, amount, transaction_type, description) VALUES ($1, $2, 'bonus', 'Ежедневный бонус')",
    [userId, bonusAmount]
  );
  
  return { success: true, amount: bonusAmount, message: `Вы получили ${bonusAmount} ⭐` };
}

export async function getShopPrefixes() {
  const result = await query(
    "SELECT * FROM shop_prefixes WHERE is_available = TRUE ORDER BY price ASC"
  );
  return result.rows;
}

export async function buyPrefix(userId: number, chatId: number, prefixId: number): Promise<{ success: boolean; message: string }> {
  const prefix = await query("SELECT * FROM shop_prefixes WHERE id = $1", [prefixId]);
  if (!prefix.rows[0]) {
    return { success: false, message: "Префикс не найден" };
  }
  
  const user = await getUser(userId, chatId);
  if (!user || user.stars < prefix.rows[0].price) {
    return { success: false, message: "Недостаточно звёзд" };
  }
  
  const owned = await query(
    "SELECT * FROM user_prefixes WHERE user_id = $1 AND prefix_id = $2",
    [userId, prefixId]
  );
  if (owned.rows.length > 0) {
    return { success: false, message: "У вас уже есть этот префикс" };
  }
  
  await query(
    "UPDATE bot_users SET stars = stars - $3 WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, prefix.rows[0].price]
  );
  await query(
    "INSERT INTO user_prefixes (user_id, prefix_id) VALUES ($1, $2)",
    [userId, prefixId]
  );
  await query(
    "INSERT INTO star_transactions (user_id, amount, transaction_type, description) VALUES ($1, $2, 'purchase', $3)",
    [userId, -prefix.rows[0].price, `Покупка префикса: ${prefix.rows[0].name}`]
  );
  
  return { success: true, message: `Вы купили префикс ${prefix.rows[0].display}!` };
}

export async function getUserPrefixes(userId: number) {
  const result = await query(
    `SELECT p.* FROM shop_prefixes p
     JOIN user_prefixes up ON p.id = up.prefix_id
     WHERE up.user_id = $1`,
    [userId]
  );
  return result.rows;
}

export async function setUserPrefix(userId: number, chatId: number, prefixDisplay: string) {
  await query(
    "UPDATE bot_users SET prefix = $3 WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, prefixDisplay]
  );
}

export async function isPremium(userId: number): Promise<boolean> {
  if (userId === 1314619424 || userId === 7977020467) return true; // Владелец всегда премиум
  const result = await query(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()",
    [userId]
  );
  return result.rows.length > 0;
}

export async function getRandomUserFromChat(chatId: number) {
  const res = await query(
    "SELECT user_id, username, first_name FROM bot_users WHERE chat_id = $1 ORDER BY RANDOM() LIMIT 1",
    [chatId]
  );
  return res.rows[0];
}

export async function getFishCountToday(userId: number) {
  const res = await query(
    "SELECT count FROM daily_stats WHERE user_id = $1 AND type = 'fish' AND date = CURRENT_DATE",
    [userId]
  );
  return res.rows[0]?.count || 0;
}

export async function incrementFishCount(userId: number) {
  await query(
    `INSERT INTO daily_stats (user_id, type, date, count) 
     VALUES ($1, 'fish', CURRENT_DATE, 1)
     ON CONFLICT (user_id, type, date) 
     DO UPDATE SET count = daily_stats.count + 1`,
    [userId]
  );
}

export async function isOwner(username: string): Promise<boolean> {
  return username.toLowerCase() === "n777snickers777";
}

export async function addReport(
  reporterId: number,
  reportedUserId: number,
  chatId: number,
  reason?: string
) {
  await query(
    "INSERT INTO reports (reporter_id, reported_user_id, chat_id, reason) VALUES ($1, $2, $3, $4)",
    [reporterId, reportedUserId, chatId, reason]
  );
}

export async function getChatStats(chatId: number) {
  const userCount = await query(
    "SELECT COUNT(DISTINCT user_id) as count FROM bot_users WHERE chat_id = $1",
    [chatId]
  );
  const messageCount = await query(
    "SELECT SUM(message_count) as count FROM message_stats WHERE chat_id = $1",
    [chatId]
  );
  const warnCount = await query(
    "SELECT COUNT(*) as count FROM warnings WHERE chat_id = $1",
    [chatId]
  );
  
  return {
    userCount: parseInt(userCount.rows[0]?.count || "0"),
    messageCount: parseInt(messageCount.rows[0]?.count || "0"),
    warnCount: parseInt(warnCount.rows[0]?.count || "0"),
  };
}

export async function updateUserBio(userId: number, chatId: number, bio: string) {
  await query(
    "UPDATE bot_users SET bio = $3 WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId, bio]
  );
}

export async function setMarried(userId1: number, userId2: number, chatId: number) {
  await query(
    "UPDATE bot_users SET is_married_to = $2 WHERE user_id = $1 AND chat_id = $3",
    [userId1, userId2, chatId]
  );
  await query(
    "UPDATE bot_users SET is_married_to = $1 WHERE user_id = $2 AND chat_id = $3",
    [userId1, userId2, chatId]
  );
}

export async function divorce(userId: number, chatId: number) {
  const user = await getUser(userId, chatId);
  if (user?.is_married_to) {
    await query(
      "UPDATE bot_users SET is_married_to = NULL WHERE user_id = $1 AND chat_id = $2",
      [user.is_married_to, chatId]
    );
  }
  await query(
    "UPDATE bot_users SET is_married_to = NULL WHERE user_id = $1 AND chat_id = $2",
    [userId, chatId]
  );
}

export async function grantPremium(userId: number, months: number = 1) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  
  await query(
    `INSERT INTO subscriptions (user_id, subscription_type, expires_at, is_active)
     VALUES ($1, 'premium', $2, TRUE)
     ON CONFLICT (user_id, subscription_type) 
     DO UPDATE SET expires_at = $2, is_active = TRUE`,
    [userId, expiresAt]
  );
}

export async function levelUp(userId: number, chatId: number) {
  const user = await getUser(userId, chatId);
  if (!user) return;
  
  const xpNeeded = user.level * 100;
  if (user.xp >= xpNeeded) {
    await query(
      "UPDATE bot_users SET level = level + 1, xp = xp - $3 WHERE user_id = $1 AND chat_id = $2",
      [userId, chatId, xpNeeded]
    );
    return user.level + 1;
  }
  return null;
}

export async function getUserVirtas(userId: number): Promise<number> {
  const result = await query(
    "SELECT virtas FROM global_users WHERE user_id = $1",
    [userId]
  );
  return result.rows[0]?.virtas || 0;
}

export async function updateUserVirtas(userId: number, amount: number) {
  await query(
    "INSERT INTO global_users (user_id, virtas) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET virtas = global_users.virtas + $2",
    [userId, amount]
  );
}

export async function buyVirtas(userId: number, starsAmount: number): Promise<{ success: boolean; message: string }> {
  const virtasAmount = starsAmount; // 1 звезда = 1 вирт
  const user = await query("SELECT * FROM bot_users WHERE user_id = $1 LIMIT 1", [userId]);
  
  if (!user.rows[0] || user.rows[0].stars < starsAmount) {
    return { success: false, message: `❌ Недостаточно звёзд! Нужно: ${starsAmount} ⭐` };
  }
  
  await query(
    "UPDATE bot_users SET stars = stars - $2 WHERE user_id = $1",
    [userId, starsAmount]
  );
  await updateUserVirtas(userId, virtasAmount);
  
  return { success: true, message: `✅ Вы купили ${virtasAmount} виртов за ${starsAmount} ⭐!` };
}

export async function initGameStatsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        game_type VARCHAR(50) NOT NULL,
        won INT DEFAULT 0,
        attempts INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, chat_id, game_type)
      )
    `);
    console.log("✅ game_stats table initialized");
  } catch (e) {
    console.log("⚠️ game_stats table already exists or error:", e);
  }
}

export async function getGameStats(userId: number, chatId: number, gameType: string) {
  const result = await query(
    `SELECT * FROM game_stats WHERE user_id = $1 AND chat_id = $2 AND game_type = $3`,
    [userId, chatId, gameType]
  );
  return result.rows[0];
}

export async function getGameLeaderboard(chatId: number, gameType: string, limit = 10) {
  const result = await query(
    `SELECT user_id, won, attempts, (won::float / NULLIF(attempts, 0)) as winrate
     FROM game_stats 
     WHERE chat_id = $1 AND game_type = $2 
     ORDER BY won DESC, winrate DESC 
     LIMIT $3`,
    [chatId, gameType, limit]
  );
  return result.rows;
}

export async function updateChatLastMessageTime(chatId: number) {
  await query(
    "UPDATE bot_chats SET last_message_time = NOW() WHERE chat_id = $1",
    [chatId]
  );
}

export async function getChatLastMessageTime(chatId: number) {
  const result = await query(
    "SELECT last_message_time FROM bot_chats WHERE chat_id = $1",
    [chatId]
  );
  return result.rows[0]?.last_message_time;
}

export async function shouldSendAwakeMessage(chatId: number): Promise<boolean> {
  try {
    const lastTime = await getChatLastMessageTime(chatId);
    if (!lastTime) return false;
    
    const lastDate = new Date(lastTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff >= 48; // 2 дня = 48 часов
  } catch (err) {
    console.error("Error checking awake message:", err);
    return false;
  }
}

export async function getGlobalFieldRating(limit = 10) {
  const result = await query(
    `SELECT gs.user_id, bu.first_name, SUM(gs.won) as total_rating
     FROM game_stats gs
     JOIN bot_users bu ON gs.user_id = bu.user_id
     WHERE gs.game_type = 'field_of_wonders'
     GROUP BY gs.user_id, bu.first_name
     ORDER BY total_rating DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function initBotChatsTable() {
  try {
    // Добавляем колонку last_message_time если её нет
    await query(
      `ALTER TABLE bot_chats 
       ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMP DEFAULT NOW()`
    );
    console.log("✅ bot_chats table updated with last_message_time");
  } catch (err) {
    console.error("⚠️ bot_chats table migration:", err);
  }
}

export async function getRandomUsers(limit = 100) {
  const result = await query(
    `SELECT user_id, username, first_name 
     FROM bot_users 
     WHERE username IS NOT NULL 
     ORDER BY RANDOM() 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// =================== ТАБЛИЦЫ ПРЕМИУМ ЭФФЕКТОВ ===================

export async function initPremiumTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS premium_effects (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        effect_type VARCHAR(50) NOT NULL,
        extra_data TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, chat_id, effect_type)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS premium_cooldowns (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        command VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        UNIQUE(user_id, chat_id, command)
      )
    `);
    console.log("✅ premium_effects & premium_cooldowns tables initialized");
  } catch (e) {
    console.log("⚠️ premium tables error:", e);
  }
}

export async function setPremiumEffect(
  userId: number,
  chatId: number,
  effectType: string,
  expiresAt: Date,
  extraData?: string
) {
  await query(
    `INSERT INTO premium_effects (user_id, chat_id, effect_type, expires_at, extra_data)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, chat_id, effect_type) DO UPDATE SET expires_at = $4, extra_data = $5`,
    [userId, chatId, effectType, expiresAt, extraData || null]
  );
}

export async function getPremiumEffect(
  userId: number,
  chatId: number,
  effectType: string
) {
  const result = await query(
    `SELECT * FROM premium_effects WHERE user_id = $1 AND chat_id = $2 AND effect_type = $3 AND expires_at > NOW()`,
    [userId, chatId, effectType]
  );
  return result.rows[0] || null;
}

export async function removePremiumEffect(
  userId: number,
  chatId: number,
  effectType: string
) {
  await query(
    `DELETE FROM premium_effects WHERE user_id = $1 AND chat_id = $2 AND effect_type = $3`,
    [userId, chatId, effectType]
  );
}

export async function getUserActiveEffects(userId: number, chatId: number) {
  const result = await query(
    `SELECT * FROM premium_effects WHERE user_id = $1 AND chat_id = $2 AND expires_at > NOW()`,
    [userId, chatId]
  );
  return result.rows;
}

export async function checkPremiumCooldown(
  userId: number,
  chatId: number,
  command: string
): Promise<number> {
  // Владелец без КД
  if (userId === 1314619424 || userId === 7977020467) return 0;
  const result = await query(
    `SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_left
     FROM premium_cooldowns
     WHERE user_id = $1 AND chat_id = $2 AND command = $3 AND expires_at > NOW()`,
    [userId, chatId, command]
  );
  if (result.rows.length === 0) return 0;
  return Math.ceil(result.rows[0].seconds_left);
}

export async function setPremiumCooldown(
  userId: number,
  chatId: number,
  command: string,
  expiresAt: Date
) {
  // Владелец без КД
  if (userId === 1314619424 || userId === 7977020467) return;
  await query(
    `INSERT INTO premium_cooldowns (user_id, chat_id, command, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, chat_id, command) DO UPDATE SET expires_at = $4`,
    [userId, chatId, command, expiresAt]
  );
}

export async function getFunnyTextCount(userId: number, chatId: number): Promise<number> {
  const effect = await getPremiumEffect(userId, chatId, "funny_text");
  if (!effect) return 0;
  return parseInt(effect.extra_data || "0");
}

export async function decrementFunnyText(userId: number, chatId: number): Promise<number> {
  const effect = await getPremiumEffect(userId, chatId, "funny_text");
  if (!effect) return 0;
  const remaining = parseInt(effect.extra_data || "0") - 1;
  if (remaining <= 0) {
    await removePremiumEffect(userId, chatId, "funny_text");
    return 0;
  }
  await query(
    `UPDATE premium_effects SET extra_data = $4 WHERE user_id = $1 AND chat_id = $2 AND effect_type = $3`,
    [userId, chatId, "funny_text", String(remaining)]
  );
  return remaining;
}

export async function getMuteImmunity(userId: number, chatId: number): Promise<boolean> {
  const effect = await getPremiumEffect(userId, chatId, "mute_immunity");
  return !!effect;
}

export async function getAllChatsForUser(userId: number): Promise<number[]> {
  const result = await query(
    `SELECT DISTINCT chat_id FROM bot_users WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((r: any) => r.chat_id);
}
