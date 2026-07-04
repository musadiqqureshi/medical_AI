# AI Assistants Hub

A multi-domain AI assistant web app built with **Next.js** + **OpenRouter** (Claude Sonnet 4.6).
One chat engine powers 6 specialized assistants; add more by editing a single file.

## Assistants included

| Assistant | Field |
|---|---|
| 🩺 Medical Triage | Symptom triage & when to see a doctor (with emergency red-flag safety layer) |
| ⚖️ Legal Helper | Plain-language legal information |
| 💰 Finance Coach | Budgeting, saving, debt payoff |
| 📚 Study Tutor | Explains topics, builds quizzes |
| 💪 Fitness Coach | Workouts & nutrition plans |
| 💼 Career Assistant | Resumes, cover letters, interview prep |

## Setup

```bash
npm install
cp .env.local.example .env.local   # then paste your OpenRouter key
npm run dev                        # http://localhost:3005
```

Get an API key at https://openrouter.ai/keys. The model slug is set in `.env.local`
(`OPENROUTER_MODEL=anthropic/claude-sonnet-4.6`).

## How it's structured

- `src/lib/assistants.ts` — the registry. **Each persona = one object** (name, system
  prompt, disclaimer, red-flags, starters). Add a field here and it appears everywhere.
- `src/app/api/chat/route.ts` — the shared streaming engine. Applies the emergency
  red-flag safety layer, then streams Claude's response token-by-token. **Your API key
  never leaves the server.**
- `src/app/page.tsx` — the chat UI with a per-assistant thread, streaming, and a mobile
  switcher.

## Safety design

This is an **informational / triage** tool, not a diagnostic one. The medical assistant:
- Never states a diagnosis or prescribes specific drugs/doses.
- Intercepts emergency phrases (chest pain, trouble breathing, suicidal thoughts, etc.)
  before they reach the model and returns an urgent "seek emergency help" message.
- Shows a persistent disclaimer.

## Roadmap → mobile app

The backend is a plain HTTP+streaming API, so a **React Native / Expo** app can reuse it
directly: point the app at `/api/chat`, keep the same `assistants` config, and render the
token stream. See the chat with me for the mobile scaffold when you're ready.
