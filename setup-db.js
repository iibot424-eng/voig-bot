import pg from "pg";

const connectionString = "postgresql://neondb_owner:npg_hCTrcD3kIOa5@ep-delicate-art-aiciia6n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function setupTables() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully!");

    const schema = `
CREATE TABLE IF NOT EXISTS bot_users (
    user_id BIGINT,
    chat_id BIGINT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    stars INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    bio TEXT,
    prefix TEXT,
    is_afk BOOLEAN DEFAULT FALSE,
    afk_reason TEXT,
    afk_since TIMESTAMP,
    is_married_to BIGINT,
    last_bonus TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS bot_chats (
    chat_id BIGINT PRIMARY KEY,
    chat_title TEXT,
    chat_type TEXT,
    owner_id BIGINT,
    rules TEXT,
    welcome_message TEXT,
    is_antispam_enabled BOOLEAN DEFAULT FALSE,
    is_flood_control_enabled BOOLEAN DEFAULT FALSE,
    is_links_allowed BOOLEAN DEFAULT TRUE,
    is_caps_allowed BOOLEAN DEFAULT TRUE,
    media_limit INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_users (
    user_id BIGINT PRIMARY KEY,
    is_owner BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    virtas BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warnings (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    chat_id BIGINT,
    admin_id BIGINT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temp_restrictions (
    user_id BIGINT,
    chat_id BIGINT,
    restriction_type TEXT,
    admin_id BIGINT,
    expires_at TIMESTAMP,
    reason TEXT,
    PRIMARY KEY (user_id, chat_id, restriction_type)
);

CREATE TABLE IF NOT EXISTS blacklist_words (
    chat_id BIGINT,
    word TEXT,
    added_by BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (chat_id, word)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    user_id BIGINT,
    subscription_type TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, subscription_type)
);

CREATE TABLE IF NOT EXISTS shop_prefixes (
    id SERIAL PRIMARY KEY,
    name TEXT,
    display TEXT,
    price INTEGER,
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_prefixes (
    user_id BIGINT,
    prefix_id INTEGER REFERENCES shop_prefixes(id),
    PRIMARY KEY (user_id, prefix_id)
);

CREATE TABLE IF NOT EXISTS message_stats (
    user_id BIGINT,
    chat_id BIGINT,
    date DATE,
    message_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, chat_id, date)
);

CREATE TABLE IF NOT EXISTS star_transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    amount INTEGER,
    transaction_type TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reputation_history (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    chat_id BIGINT,
    from_user_id BIGINT,
    change INTEGER,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id BIGINT,
    reported_user_id BIGINT,
    chat_id BIGINT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO shop_prefixes (name, display, price) VALUES 
('Новичок', '🐣 Новичок', 100),
('Игрок', '🎮 Игрок', 500),
('Мастер', '🧙 Мастер', 1000),
('Легенда', '🐉 Легенда', 5000)
ON CONFLICT DO NOTHING;
    `;

    console.log("Creating tables...");
    await client.query(schema);
    console.log("Tables created successfully!");
    await client.end();
  } catch (err) {
    console.error("Setup failed:", err.message);
  }
}

setupTables();
