# Put Groundwork online (Vercel + Supabase)

This puts the app on the internet so it works on your phone anywhere, with your progress saved in
Supabase and your own Trading 212 account synced. It takes about 30 minutes. You don't need to
install anything; it's all done in your browser.

You'll create three things: a **Supabase** project (the database), a **Vercel** project (the
website), and a few **settings** that connect them.

---

## 1. Create the database (Supabase)

1. Go to **supabase.com** and sign up (free).
2. Click **New project**. Name it `groundwork`, set a strong database password (save it in your
   password manager), and choose the **London** (or another EU) region. Click **Create**. Wait a
   minute or two for it to finish.
3. In the left menu open **SQL Editor** → **New query**.
4. In another tab, open this file on GitHub and copy all of it:
   `frpike/Investing` → branch `claude/groundwork-mvp` → `web/supabase/migrations/20261017000000_init.sql`
   (click **Raw** to see plain text, then select all and copy).
   Paste it into the SQL Editor and click **Run**. You should see "Success. No rows returned".
5. Click **New query** again and do the same with
   `web/supabase/migrations/20261024000000_course_content.sql`. This loads the course lessons.
6. Open **Project Settings → API** (or **Data API**) and keep this tab open. You'll need:
   - the **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - the **Publishable key** (starts `sb_publishable_`) or, on older projects, the **anon public** key

   Don't use the `service_role` or **secret** key for this.

## 2. Create the website (Vercel)

1. Go to **vercel.com**, sign up with your GitHub account, and click **Add New → Project**.
2. Choose **frpike/Investing**.
3. Set **Root Directory** to `web`.
4. Open **Environment Variables** and add these, one per row:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase publishable (or anon) key |
   | `T212_API_KEY` | your Trading 212 API key |
   | `T212_API_SECRET` | your Trading 212 API secret (leave out if you didn't get one) |
   | `T212_ENV` | `live` |
   | `T212_ACCESS_CODE` | your access code (8+ characters) |
   | `OWNER_EMAIL` | the email address you'll sign in with |

   `OWNER_EMAIL` means only you, signed in, can sync your Trading 212 data, even if someone
   learns your access code.
5. Click **Deploy**. When it finishes, copy your site address (like
   `https://investing-abc123.vercel.app`).
6. Under **Settings → Git → Production Branch**, set `claude/groundwork-mvp` (or ask Claude to
   merge it into `main`). Redeploy if Vercel built from a different branch.

## 3. Connect sign-in to your site (Supabase)

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel address.
3. Under **Redirect URLs**, add `https://YOUR-SITE.vercel.app/auth/callback` (your address).
   If you also want to sign in from the copy on your computer, add
   `http://localhost:3000/auth/callback` too.
4. Click **Save**.

## 4. Sign in and bring your progress across

Your existing progress lives on your computer. To move it into Supabase:

1. On your computer, add the same two Supabase lines to `web/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
2. Restart the app (`npm run build` then `npm run start`), open `http://localhost:3000`, and click
   **Save progress** (top right). Enter your email, open the link from the email **on the same
   computer and browser**, and you're signed in. Your lessons, quiz results, portfolio and sync
   history are copied into your account automatically.

If you don't need your old progress, skip this and just sign in on the website.

## 5. Lock it down

In Supabase, open **Authentication → Sign In / Providers** (or **Settings**) and turn **off**
"Allow new users to sign up". You already have your account; this stops anyone else creating one.

## 6. Use it on your phone

1. On your phone, open your Vercel address in **Safari** (iPhone) or **Chrome** (Android).
2. Tap **Save progress**, enter your email, then open the sign-in email **on your phone** and tap
   the link. If it opens inside your email app and says the link didn't work, long-press the link
   and choose **Open in Safari / Chrome** instead. The link must open in the same browser that
   asked for it.
3. Go to **Portfolio**, enter your access code, tap **Sync now**. After this the phone remembers
   the code and syncs by itself when you open the app (at most every 15 minutes).
4. Add it to your home screen: **Share → Add to Home Screen** (iPhone) or **⋮ → Add to home
   screen** (Android).

Your progress now follows you between phone and computer.

---

### If something goes wrong

- **"Couldn't load your account"**: check the two Supabase variables in Vercel, then **Redeploy**
  (Vercel → Deployments → ⋯ → Redeploy). Variables starting `NEXT_PUBLIC_` only take effect
  after a new deploy.
- **Sign-in link says it didn't work**: open it in the same browser you requested it from, and
  check the Redirect URL in step 3 matches your site address exactly.
- **"Sign in with the owner's account to sync"**: you're not signed in, or `OWNER_EMAIL` doesn't
  match the email you signed in with.
- **Sign-in emails are slow or missing**: Supabase's built-in email is limited to a few per hour.
  Wait a few minutes; check spam.

### What's stored where

- **Supabase:** your profile, lesson progress, quiz answers, portfolio, imports and sync snapshots.
  Each row is locked to your account, and nobody else can read it.
- **Vercel settings:** your Trading 212 key and access code. They never reach the browser.
- **Your phone's browser:** your access code (if you tick "Remember"), and a sign-in session.
