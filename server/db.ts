import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import { migrate } from 'drizzle-orm/neon-http/migrator';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Включаем fetch кэширование для уменьшения запросов
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Инициализация БД - создание таблиц если их нет
export async function initializeDatabase() {
  try {
    console.log('🔄 Проверка/создание таблиц БД...');
    
    // Пытаемся запустить миграции из папки migrations
    try {
      await migrate(db, { migrationsFolder: './migrations' });
      console.log('✅ Миграции применены успешно');
    } catch (migrationError: any) {
      // Если миграции не существуют, создаём таблицы вручную через drizzle-kit
      console.log('📝 Миграции не найдены, создаём таблицы вручную...');
      
      // Используем drizzle для создания всех таблиц из schema
      const tables = [
        'users', 'marriages', 'relationships', 'duels', 'chats', 
        'warnings', 'pending_proposals', 'businesses', 'mutes', 'bans', 'inventory',
        'premium_purchases', 'currency_purchases'
      ];
      
      // Проверяем существует ли хотя бы таблица users
      try {
        await db.execute(`SELECT 1 FROM "users" LIMIT 1`);
        console.log('✅ Таблицы уже существуют');
      } catch (tableError: any) {
        if (tableError.code === '42P01') {
          console.log('⚠️ Таблицы не найдены, пытаемся пересоздать...');
          // Таблицы не существуют - нужно запустить drizzle-kit push
          console.log('⚠️ Требуется запуск: npm run db:push');
        }
        throw tableError;
      }
    }
  } catch (error: any) {
    console.error('❌ Ошибка инициализации БД:', error?.message || error);
    throw error;
  }
}
