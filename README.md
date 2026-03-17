# سين جيم — Seen Jeem 🎯

Arabic trivia game for teams — built with Next.js, Firebase, and Tailwind CSS.

---

## Quick start (follow in order)

### Step 1 — Clone and install

```bash
# Paste the project folder you downloaded, then:
cd seen-jeem
npm install
```

---

### Step 2 — Create Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `seen-jeem` → continue
3. Enable **Google Analytics** (optional) → Create project

#### Enable services:

| Service | How |
|---------|-----|
| **Firestore** | Build → Firestore Database → Create database → **Production mode** → choose region |
| **Realtime Database** | Build → Realtime Database → Create database → **Locked mode** → choose region |
| **Authentication** | Build → Authentication → Get started → **Anonymous** → Enable → Save |

#### Get your config keys:

Project Settings (gear icon) → General → scroll to **Your apps** → click `</>` (Web) →
Register app as `seen-jeem-web` → copy the `firebaseConfig` object.

---

### Step 3 — Set environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Firebase values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seen-jeem.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seen-jeem
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://seen-jeem-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:abc123
NEXT_PUBLIC_EDITOR_PASSWORD=your-secret-password
```

---

### Step 4 — Deploy Firebase security rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # select your seen-jeem project
firebase deploy --only firestore,database
```

---

### Step 5 — Seed the question bank (optional but recommended)

This writes all 270 Arabic questions to Firestore so the game has questions
without needing to use the editor first.

```bash
# Download a service account key:
# Firebase Console → Project Settings → Service accounts → Generate new private key
# Save as serviceAccount.json in the project root (it is gitignored)

GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
  npx ts-node --project tsconfig.json scripts/seed.ts
```

---

### Step 6 — Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

### Step 7 — Deploy to Vercel

```bash
# Push to GitHub first
git init && git add . && git commit -m "init seen-jeem"
gh repo create seen-jeem --public --push

# Deploy
npx vercel --prod
```

When Vercel prompts for environment variables, paste the same values
from your `.env.local` into **Settings → Environment Variables**.

---

## How to play

### Host flow
1. Open `yourdomain.com` → enter team names → click **ابدأ اللعبة**
2. You are redirected to `/host/[ROOM_CODE]`
3. Share the join link (shown in header) with players — they open it on their own devices
4. Both teams take turns picking 3 categories each (snake draft: A → B → B → A → A → B)
5. Click any card on the board to reveal the question
6. Timer runs: 60s for the active team, then 30s for the opponent
7. Click the team button to award points, or **تخطي** to skip
8. If neither team answers, the card auto-cancels when the timer expires

### Player flow
1. Open the share link from the host on your phone
2. Watch the board update in real time — scores, answered cards, timer

### Question editor
1. Go to `yourdomain.com/editor`
2. Enter the password (`NEXT_PUBLIC_EDITOR_PASSWORD` from your `.env.local`)
3. Select a category, type a question and answer, click **حفظ**

---

## Project structure

```
seen-jeem/
├── app/
│   ├── page.tsx                  # Lobby — create / join room
│   ├── host/[roomId]/page.tsx    # Host view — full game control
│   ├── game/[roomId]/page.tsx    # Player view — live read-only board
│   └── editor/page.tsx           # Question bank editor
├── hooks/
│   ├── useGame.ts                # Firestore real-time sync + all game actions
│   └── useTimer.ts               # 60s+30s timer via Realtime Database
├── lib/
│   ├── firebase.ts               # Firebase singleton
│   └── categories.ts             # Category definitions + local fallback questions
├── types/
│   └── game.ts                   # TypeScript types
├── scripts/
│   └── seed.ts                   # One-time Firestore seeder
├── firestore.rules               # Firestore security rules
├── database.rules.json           # Realtime DB security rules
└── firebase.json                 # Firebase deploy config
```

---

## Lifelines

| Name | Arabic | Effect |
|------|--------|--------|
| Double Guess | تخمين مزدوج | Team gets 2 attempts on one question |
| Call a Friend | اتصل بصديق | 30-second pause to consult someone |
| The Pit | الحفرة | Next correct answer deducts from the opponent |
| Istarih | استريح | Opponent must sit a player out this round |

---

## Customisation tips

- **Add questions:** Use `/editor` or re-run `scripts/seed.ts` with more entries
- **Change team colours:** Edit `--a` and `--b` CSS variables in `app/globals.css`
- **Add more lifelines:** Extend `useLifeline()` in `hooks/useGame.ts`
- **Change point values:** Edit `POINTS` array in `lib/categories.ts`
- **Custom domain on Vercel:** Settings → Domains → Add your domain
