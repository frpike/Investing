// Upserts course modules, lessons and question ids into Supabase so progress rows can
// reference them. Run after changing /content:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run content:sync
import { createClient } from "@supabase/supabase-js";
import { contentRows } from "../src/lib/content-sync";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { modules, lessons, questions } = contentRows();
for (const [table, rows] of [["course_modules", modules], ["lessons", lessons], ["quiz_questions", questions]] as const) {
  const { error } = await db.from(table).upsert(rows as Record<string, unknown>[]);
  if (error) { console.error(`${table}: ${error.message}`); process.exit(1); }
  console.log(`${table}: ${rows.length} rows`);
}
