# StyleSync — building the phone app (Capacitor wrap)

The native app loads the live site (`stylesync-murex.vercel.app`) inside a native
shell. Content updates instantly (no resubmit). Config: `capacitor.config.ts`.

Run all commands from the `web/` folder.

## One-time: generate icons + splash
Put a **1024×1024 PNG** logo at `web/resources/icon.png` (and optionally
`web/resources/splash.png` at 2732×2732), then:
```bash
npx @capacitor/assets generate
```

---

## Android (works on Windows)
**Prereqs:** install **Android Studio** (bundles the Android SDK + JDK).

```bash
pnpm cap:add:android     # creates web/android (once)
pnpm cap:sync            # copy config + plugins (run after any config change)
pnpm cap:android         # opens Android Studio
```
In Android Studio:
1. Let Gradle finish syncing.
2. **Run ▶** on an emulator or a USB-connected phone (enable Developer Options →
   USB debugging) to test.
3. Release build: **Build → Generate Signed App Bundle** → create a **keystore**
   (⚠️ back it up + save the passwords forever — losing it means you can never
   update the app) → produces `app-release.aab`.
4. Upload the `.aab` at **play.google.com/console** (one-time $25).

## iOS (needs macOS + Xcode)
On a Mac:
```bash
pnpm cap:add:ios
pnpm cap:sync
pnpm cap:ios              # opens Xcode
```
Then set a Team (Apple Developer, $99/yr), run on a device, and upload via Xcode →
App Store Connect. No Mac? Use a cloud build (Codemagic / Ionic Appflow) or a
rented Mac (MacinCloud).

---

## Whenever you change `capacitor.config.ts` or add a plugin
```bash
pnpm cap:sync
```
