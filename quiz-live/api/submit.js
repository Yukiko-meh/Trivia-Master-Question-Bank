import { pickQuestions } from "../public/questions.js";
import { hsetnx } from "./_store.js";

// 收到每題選了什麼,由伺服器對照題庫重新算分,避免有人直接送高分。
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const room = String(body.room || "");
  const qs = pickQuestions(room);
  if (!qs) return res.status(400).json({ error: "bad_room" });

  let name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 8);
  if (!name) return res.status(400).json({ error: "bad_name" });

  const answers = Array.isArray(body.answers) ? body.answers : [];
  let score = 0;
  for (const a of answers) {
    const q = qs.find((x) => x.id === a?.id);
    if (q && a.a === q.correct) score++;
  }
  // 總作答時間(毫秒),限制在合理範圍
  const ms = Math.max(0, Math.min(Number(body.ms) || 0, 60 * 60 * 1000));

  const key = `room:${room}`;
  const value = JSON.stringify({ score, ms, at: Date.now() });
  let final = name;
  for (let i = 1; i <= 20; i++) {
    final = i === 1 ? name : `${name.slice(0, 6)}${i}`;
    if (await hsetnx(key, final, value)) {
      return res.status(200).json({ ok: true, name: final, score, total: qs.length, ms });
    }
  }
  return res.status(409).json({ error: "name_taken" });
}
