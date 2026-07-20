import { sql } from "@vercel/postgres";

export async function getUserByUsername(username) {
  const { rows } = await sql`SELECT id, username, password_hash, is_admin FROM users WHERE username = ${username}`;
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await sql`SELECT id, username, password_hash, is_admin FROM users WHERE id = ${id}`;
  return rows[0] || null;
}

export async function createUser(username, passwordHash, isAdmin) {
  const { rows } = await sql`
    INSERT INTO users (username, password_hash, is_admin)
    VALUES (${username}, ${passwordHash}, ${isAdmin})
    RETURNING id, username, is_admin
  `;
  return rows[0];
}

export async function getProgress(userId) {
  const { rows } = await sql`SELECT state FROM progress WHERE user_id = ${userId}`;
  return rows[0]?.state ?? null;
}

/* লিডারবোর্ড: সব আসল ব্যবহারকারীর XP অনুযায়ী তালিকা।
   XP প্রগ্রেসের JSONB blob-এ থাকে, তাই সেখান থেকেই বের করা হয়। */
export async function getLeaderboard(limit = 25) {
  const { rows } = await sql`
    SELECT u.username,
           COALESCE(NULLIF(p.state->>'xp', '')::numeric, 0)::int AS xp,
           COALESCE(NULLIF(p.state->>'streak', '')::numeric, 0)::int AS streak
    FROM users u
    LEFT JOIN progress p ON p.user_id = u.id
    ORDER BY xp DESC, u.username ASC
    LIMIT ${limit}
  `;
  return rows;
}

export async function upsertProgress(userId, state) {
  await sql`
    INSERT INTO progress (user_id, state, updated_at)
    VALUES (${userId}, ${JSON.stringify(state)}::jsonb, now())
    ON CONFLICT (user_id)
    DO UPDATE SET state = ${JSON.stringify(state)}::jsonb, updated_at = now()
  `;
}
