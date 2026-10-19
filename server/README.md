# Cyber Tutor setup

The UI uses POST `/api/chat` with the actual applied simulation configuration, metrics, tick, mode, progressive hint level, and the last 12 conversation messages. It labels Gemini and offline replies separately. Messages are plain text; optional cited learning-source titles appear below replies. No engine commands or tools are available to the model.

## Start

1. Run `npm install` (the official `@google/genai` SDK is included).
2. Copy `.env.example` to `.env`. Add your key as `GEMINI_API_KEY`; leave this file untracked. Never use a `VITE_` variable for the key.
3. Optionally set `GEMINI_MODEL` to a model available to your account. The default is `gemini-flash-latest`; account access is not verified without a key.
4. Run `npm run ai` in one terminal (Node 22+).
5. Run `npm run dev` in another. For a production frontend preview, build then restart `npm run preview` so the API proxy is loaded.

The API listens only on `127.0.0.1:8787`. Vite dev/preview proxy `/api` there. If you later replace the API, preserve the request shape in `src/adapters/tutorApi.ts` and return `{ "provider": "gemini", "answer": "Plain text", "sources": [{ "id": "queue", "title": "Queues and modeled latency" }] }`.

The server retrieves up to three relevant local passages from `knowledge.mjs`; no vector database or embedding service is required. Returned references include only retrieved IDs cited in the answer; this is not a semantic fact-check. The system prompt separates measurements from model assumptions and uses progressive challenge hints, but generated answers can still be wrong.

Limits: 1000 characters per question, 12 recent messages, 40 displayed messages per mode, 90KB request body, 16-second server deadline, 18-second client deadline, one concurrent provider request. No chat persistence. API errors fall back to the existing deterministic guide with an explicit reason. Unknown offline questions acknowledge the guide's limited coverage. No key or raw provider error is logged or returned.

Run `npm run test:ai`, `npm test`, and `npm run build`. Tests cover retrieval, request validation, missing key, provider failure, history/context forwarding and sources using an injected provider. Actual Gemini connectivity, account/model access and generated teaching quality require your key and are not claimed as tested.
