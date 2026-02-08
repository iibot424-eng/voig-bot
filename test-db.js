import pg from "pg";

const connectionString = "postgresql://neondb_owner:npg_hCTrcD3kIOa5@ep-delicate-art-aiciia6n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function testConnection() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query("SELECT NOW()");
    console.log("Result:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

testConnection();
