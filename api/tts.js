// Proxies Google's unofficial translate_tts endpoint server-side so the
// browser never talks to a third-party scraping URL directly, and so
// repeated words (the same vocab item spoken many times) get cached by the
// browser/edge instead of re-hitting Google every time.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const text = (req.query.q || "").toString().slice(0, 200);
  if (!text) return res.status(400).json({ error: "missing q" });

  const upstreamUrl =
    "https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=" +
    encodeURIComponent(text);

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EshoArbiShikhi/1.0)" },
    });
  } catch {
    return res.status(502).json({ error: "tts upstream unreachable" });
  }
  if (!upstream.ok) return res.status(502).json({ error: "tts upstream failed" });

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  return res.status(200).send(buf);
}
