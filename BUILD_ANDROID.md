# Building the Android app

This app is an installable **PWA**. The Android app is a **TWA** (Trusted Web
Activity) — a thin native wrapper that loads the deployed website full-screen.
That means: **deploy the site first, then package.** The APK cannot bundle the
app offline; it points at your live URL.

Values already set for you:

| | |
|---|---|
| App name | Medical AI Assistant |
| Package id (suggested) | `com.musadiqqureshi.medicalai` |
| Manifest | `https://YOUR_DOMAIN/manifest.webmanifest` |
| Theme / background | `#7c6cf0` / `#f6f5fb` |
| Icons | `public/icons/` (192, 512, maskable, apple) |

---

## Step 1 — Deploy (once)

Easiest is **Vercel**:

1. [vercel.com](https://vercel.com) → **New Project** → import `musadiqqureshi/medical_AI`.
2. Add Environment Variables (Settings → Environment Variables):
   - `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (payments, later) `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_WEBHOOK_SECRET`
3. Deploy → note the URL, e.g. `https://medical-ai.vercel.app`.

---

## Step 2 — Package the APK/AAB

### Option A — PWABuilder (no local tools, recommended)

1. Go to [pwabuilder.com](https://www.pwabuilder.com), paste your deployed URL.
2. It scores the PWA (manifest ✓, service worker ✓, icons ✓ — all present).
3. **Package for stores → Android** → choose signing (let it generate a key,
   and **save the key + password**) → download the `.aab` (for Play) and a
   test `.apk`.
4. PWABuilder shows an `assetlinks.json` snippet — see Step 3.

### Option B — Bubblewrap (build locally; Android SDK is already on this Mac)

```bash
npm i -g @bubblewrap/cli

# from an empty folder:
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.webmanifest
#   → package name: com.musadiqqureshi.medicalai
#   → it will offer to download JDK/Android build tools if needed

bubblewrap build          # produces app-release-signed.apk + .aab
bubblewrap install        # installs to a connected device/emulator
```

Keep the generated `android.keystore` + passwords safe — you need the same key
for every future update.

---

## Step 3 — Verify the domain (removes the URL bar)

A TWA only goes full-screen (no browser address bar) if Digital Asset Links
match your signing key to your domain.

1. Get the SHA-256 fingerprint of your signing key (PWABuilder shows it, or):
   ```bash
   keytool -list -v -keystore android.keystore -alias android | grep SHA256
   ```
2. Host this at `https://YOUR_DOMAIN/.well-known/assetlinks.json`:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.musadiqqureshi.medicalai",
       "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
     }
   }]
   ```
   > Tell Claude your fingerprint and it will add a Next.js route that serves
   > this automatically — no manual hosting needed.

---

## Step 4 — Install / publish

- **Test now:** sideload the `.apk` (transfer to phone, enable "install unknown
  apps", tap it).
- **Publish:** upload the `.aab` to Google Play Console (needs a one-time $25
  developer account).

---

### Before you ship, make sure the app actually works end-to-end:
- [ ] `LLM_API_KEY` (OpenRouter) set in Vercel — otherwise chat can't reach the model
- [ ] Supabase SQL from `supabase/schema.sql` run — for credits
- [ ] Email confirmation configured the way you want — for login
- [ ] A real payment gateway wired if you want paid plans live
