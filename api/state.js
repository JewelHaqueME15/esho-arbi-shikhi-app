import { requireUser } from "../lib/auth.js";
import { upsertProgress } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ error: "method not allowed" });
  const session = await requireUser(req, res);
  if (!session) return; // requireUser already sent 401

  const { state } = req.body || {};
  if (!state || typeof state !== "object") return res.status(400).json({ error: "state must be an object" });

  await upsertProgress(session.id, state);
  return res.status(200).json({ ok: true });
}
