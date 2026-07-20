// আসল লিডারবোর্ড — সব ব্যবহারকারীর XP ডাটাবেস থেকে। লগইন করা থাকলেই কেবল দেখা যায়,
// যাতে ব্যবহারকারীর নাম বাইরে ফাঁস না হয়। কোনো পেইড সার্ভিস লাগে না — যে Postgres
// আগে থেকেই আছে, সেটিই ব্যবহার করা হচ্ছে।
import { requireUser } from "../lib/auth.js";
import { getLeaderboard } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const session = await requireUser(req, res);
  if (!session) return; // requireUser already sent 401

  try {
    const rows = await getLeaderboard(25);
    // প্রতিবার নতুন তথ্য চাই — ক্যাশ করা যাবে না
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ me: session.username, rows });
  } catch {
    return res.status(500).json({ error: "leaderboard unavailable" });
  }
}
