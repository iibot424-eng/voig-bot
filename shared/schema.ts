import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, timestamp, serial, bigint, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - основная таблица пользователей Telegram
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  balance: integer("balance").notNull().default(0),
  reputation: integer("reputation").notNull().default(0),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until"),
  transformAnimal: text("transform_animal"),
  transformUntil: timestamp("transform_until"),
  dailyBonusAt: timestamp("daily_bonus_at"),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastActive: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Marriages table - браки между пользователями
export const marriages = pgTable("marriages", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  user2Id: integer("user2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: bigint("chat_id", { mode: "number" }),
  marriedAt: timestamp("married_at").notNull().defaultNow(),
});

export const insertMarriageSchema = createInsertSchema(marriages).omit({
  id: true,
  marriedAt: true,
});
export type InsertMarriage = z.infer<typeof insertMarriageSchema>;
export type Marriage = typeof marriages.$inferSelect;

// Relationships table - отношения (dating)
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  user2Id: integer("user2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: bigint("chat_id", { mode: "number" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
});

export const insertRelationshipSchema = createInsertSchema(relationships).omit({
  id: true,
  startedAt: true,
});
export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;
export type Relationship = typeof relationships.$inferSelect;

// Duels table - дуэли между игроками
export const duels = pgTable("duels", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  opponentId: integer("opponent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  bet: integer("bet").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  winnerId: integer("winner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertDuelSchema = createInsertSchema(duels).omit({
  id: true,
  createdAt: true,
});
export type InsertDuel = z.infer<typeof insertDuelSchema>;
export type Duel = typeof duels.$inferSelect;

// Chats table - информация о группах/чатах
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull().unique(),
  title: text("title"),
  type: text("type"), // group, supergroup, channel
  antispamEnabled: boolean("antispam_enabled").notNull().default(false),
  settings: jsonb("settings").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;

// Warnings table - предупреждения пользователям
export const warnings = pgTable("warnings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  reason: text("reason"),
  issuedBy: integer("issued_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWarningSchema = createInsertSchema(warnings).omit({
  id: true,
  createdAt: true,
});
export type InsertWarning = z.infer<typeof insertWarningSchema>;
export type Warning = typeof warnings.$inferSelect;

// Pending proposals - отложенные предложения (браки, дуэли)
export const pendingProposals = pgTable("pending_proposals", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // marry, duel
  fromUserId: integer("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  data: jsonb("data").$type<Record<string, any>>().default({}),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPendingProposalSchema = createInsertSchema(pendingProposals).omit({
  id: true,
  createdAt: true,
});
export type InsertPendingProposal = z.infer<typeof insertPendingProposalSchema>;
export type PendingProposal = typeof pendingProposals.$inferSelect;
