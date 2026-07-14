import { requireUser } from "../lib/auth.js";
import { getProgress } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const session = await requireUser(req, res);
  if (!session) return; // requireUser already sent 401

  const state = await getProgress(session.id);
  return res.status(200).json({ username: session.username, isAdmin: session.isAdmin, state: state || {} });
}
