// 儲存層:有設定 Upstash/Vercel KV 就用它,沒有就用記憶體(只適合本機測試)。
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = globalThis.__quizMem || (globalThis.__quizMem = new Map());

async function cmd(args) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export const usingKV = Boolean(URL_ && TOKEN);

// 只在欄位不存在時寫入,成功回傳 true
export async function hsetnx(key, field, value) {
  if (usingKV) {
    const ok = (await cmd(["HSETNX", key, field, value])) === 1;
    if (ok) await cmd(["EXPIRE", key, 60 * 60 * 24 * 14]);
    return ok;
  }
  const h = mem.get(key) || new Map();
  mem.set(key, h);
  if (h.has(field)) return false;
  h.set(field, value);
  return true;
}

export async function hgetall(key) {
  if (usingKV) {
    const a = (await cmd(["HGETALL", key])) || [];
    const out = {};
    for (let i = 0; i < a.length; i += 2) out[a[i]] = a[i + 1];
    return out;
  }
  return Object.fromEntries(mem.get(key) || []);
}
