import { getUserByUsername } from "../../lib/db.js";
import { verifyPassword, signSession, setSessionCookie } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const { username, password } = req.body || {};
  const name = (username || "").trim().slice(0, 24);
  if (!name) return res.status(400).json({ error: "নাম দিতে হবে" });

  const user = await getUserByUsername(name);
  if (!user) return res.status(401).json({ error: "ভুল নাম বা পাসওয়ার্ড" });

  const ok = await verifyPassword(password || "", user.password_hash);
  if (!ok) return res.status(401).json({ error: "ভুল নাম বা পাসওয়ার্ড" });

  const token = await signSession({ id: user.id, username: user.username, isAdmin: user.is_admin });
  setSessionCookie(res, token);
  return res.status(200).json({ username: user.username, isAdmin: user.is_admin });
}
