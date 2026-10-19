# Cyber Tutor: repaired Gemini + retrieval pipeline

Changed files: `server/chat.mjs`, `server/knowledge.mjs`, `server/chat.test.mjs`, `server/README.md`, `src/adapters/tutorApi.ts`, `src/components/CyberTutor.tsx`, `src/index.css`, `package.json`, `.env.example`. Added `server/provider.mjs` for SDK request assembly and diagnostics, and `server/start.mjs` for combined startup. No mobile layout, engine, shared contract, or tutor placement changes.

## Confirmed original blockers

The local session had no `.env`, no `GEMINI_API_KEY`, and no API listener on 8787. The old running preview returned HTML for `/api/health` instead of reaching the API. The previous `npm run dev`/`preview` started only Vite and required a separate server command; the already-running preview also predated the proxy configuration. In addition, ordinary troubleshooting wording could retrieve no documents, and provider errors were collapsed into one generic message.

## Start everything (Node 22+)

```powershell
npm install
Copy-Item .env.example .env
# Edit .env locally and replace your_new_key_here with a fresh Gemini Developer API key.
npm run dev
```

Do not overwrite an existing `.env` when following the copy step. Add only `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. Never put keys in chat, source control, React code, or VITE_ variables. `.env` is gitignored. Restart after editing it.

`npm run dev` now starts the local API and Vite together. To use the production frontend:

```powershell
npm run build
npm run preview -- --port 4173
```

The API listens only on `127.0.0.1:8787`. Vite proxies `/api` there. The combined launcher reuses an existing CyberLab API, but refuses to reuse an unrelated service on that port. Stop the old API before restarting after a key change. Advanced separate-terminal commands remain `npm run ai` and `npm run dev:frontend` / `npm run preview:frontend`.

## Diagnostics

GET `/api/health` returns the service identity, whether a non-placeholder key is configured, selected model, document count, and whether a real Gemini generation has succeeded in this server process. Configured is not proof of authentication. The drawer shows this state and reports specific missing-key, authentication, model-access, quota, timeout, and connection errors. Raw SDK errors and key values are never returned.

`GEMINI_MODEL` defaults to `gemini-flash-latest`, an alias documented in the [official Gemini model reference](https://ai.google.dev/gemini-api/docs/models). Account-specific access still requires a successful request. No valid credential was available during the repair, so live authentication, model access and generated answer quality remain unverified.

## Retrieval and context

Nine curated documents in `knowledge.mjs` cover resources, bandwidth, CPU, queues, DDoS, filters, balancing, SYN exhaustion, availability, troubleshooting and educational assumptions. Questions are normalized and ranked by keyword matches. Troubleshooting wording adds relevant current-pressure terms; pronoun-based follow-ups include recent user topics. Unknown unrelated questions can return no passages rather than fabricated sources.

POST `/api/chat` accepts the shape in `src/adapters/tutorApi.ts`: question, recent messages, applied simulation config, actual metrics, tick, mode, hintLevel. Validation strips arbitrary extra properties. Up to three retrieved passages and current metrics reach `buildGeminiRequest`, which builds native user/model conversation turns and a current-context JSON message. The server supplies a separate teaching system instruction; no tools or configuration-changing commands are exposed. Challenge guidance is progressive.

The response includes the generated answer, cited `sources`, actual `retrievedSources`, and `contextTick`. Cited sources are restricted to IDs retrieved for that request. A retrieved passage is context, not automatic proof of every generated claim. The UI keeps references optional and does not invent them. All chat text is rendered as plain text.

Failures show an explicit AI error. Students may choose **Use offline explanation** to reveal the existing deterministic guide. Offline text is never labeled Gemini and is never substituted silently.

Limits: 1000-character questions, last 12 conversation messages sent, 40 displayed messages per mode, 90KB body, 16-second server deadline, 18-second client deadline, one concurrent provider request. Chat is not persisted. Generated answers can still be wrong.

## Verification

Run `npm run test:ai`, `npm test`, `npm run build`. API tests cover retrieval including troubleshooting/follow-ups, exact SDK prompt assembly with passages and measured values, native history roles, health/configuration, sanitized errors, input validation, missing keys, provider failure, and source filtering. Provider injection is a transport test, not a claim that live Gemini was tested. Verify actual connectivity after adding your new local key by asking a question in the drawer and confirming a Gemini-labeled response and health liveVerified=true.
