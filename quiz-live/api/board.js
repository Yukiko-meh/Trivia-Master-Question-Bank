import { parseRoom } from "../public/questions.js";
import { hgetall, usingKV } from "./_store.js";

// 排名:答對題數多的在前,同分時用時短的在前,完全相同則同名次。
export default async function handler(req, res) {
  const room = String(req.query?.room || "");
  const info = parseRoom(room);
  if (!info) return res.status(400).json({ error: "bad_room" });
  const all = await hgetall(`room:${room}`);
  const rows = Object.entries(all)
    .map(([name, v]) => {
      try { const o = JSON.parse(v); return { name, score: o.score, ms: o.ms }; } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.ms - b.ms || a.name.localeCompare(b.name));
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && prev.score === r.score && prev.ms === r.ms ? prev.rank : i + 1;
  });
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ room, grade: info.grade, total: info.n, count: rows.length, rows: rows.slice(0, 100), persistent: usingKV });
}
