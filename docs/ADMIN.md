# Admin (Supabase Auth) — Phase 4

The admin area lives at **`/admin`** and is protected by **Supabase Auth**.
This replaces the previous Sveltia/Decap + GitHub-OAuth setup (removed). The
public website is unaffected.

- `/admin/login` — public login page (email + password).
- `/admin` — protected; only an authenticated **and authorized** admin gets in.

Everything is **client-side** (no Node/SSR server), so the site stays a static
Astro build deployable to Hostinger. Real security is enforced by **Row Level
Security** in the database, not by hiding UI.

## How it works

1. Login calls `supabase.auth.signInWithPassword()`.
2. On success we check authorization: a `select` on `admin_users`. Its RLS
   policy only returns rows when `private.is_admin()` is true, so a non-empty
   read *is* the admin signal. Non-admins are signed out immediately.
3. The session (JWT) is stored by supabase-js and survives refresh/navigation;
   it auto-refreshes and is cleared on logout.
4. `/admin` runs a guard before revealing anything: no session → redirect to
   `/admin/login`; authenticated-but-not-admin → sign out + access denied.

## Files

| File | Role |
|---|---|
| `src/lib/supabase.ts` | Browser Supabase client (anon key only). |
| `src/lib/auth.ts` | `signIn`, `signOut`, `isAdmin`, `requireAdmin` guard. |
| `src/pages/admin/login.astro` | Login page. |
| `src/pages/admin/index.astro` | Protected placeholder (dashboard is Phase 5+). |
| `src/styles/admin.css` | Admin-only styles (separate from public `styles.css`). |

## Environment variables (client-safe)

Copy `.env.example` → `.env` and set:

```
PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="<anon or publishable key>"
```

Both are **public by design** (RLS protects data). The **service-role key is
never** used in client code or committed. `.env` is git-ignored.

## Creating the initial admin (do this once)

There is **no public registration**. Create the single admin securely:

1. Supabase Dashboard → **Authentication → Users → Add user**. Enter the admin
   email + a strong password, and enable "Auto Confirm User".
2. Authorize that user by adding them to `admin_users` (SQL editor):

   ```sql
   insert into admin_users (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

3. **Disable public sign-ups**: Authentication → Providers → Email → turn off
   "Allow new users to sign up". (Even without this, a stray sign-up cannot
   access the admin or write data — they won't be in `admin_users` and RLS
   blocks everything — but disabling it is cleaner.)

Now log in at `/admin/login`.

## Hostinger routing note

With `build.format: 'file'`, the build emits `dist/admin.html` (for `/admin`)
and `dist/admin/login.html` (for `/admin/login`). On Hostinger, an `.htaccess`
clean-URL rule (Phase 10) maps `/admin` and `/admin/login` to those files.
