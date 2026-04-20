# Twilio Gujarati IVR Complaint System

Node.js + Express backend for IVR-based complaint registration using:
- Twilio Voice webhooks and recording
- Google Cloud Speech-to-Text (Gujarati `gu-IN`)
- Gemini AI summarization

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Create `.env` from `.env.example` and fill values.

Required setup:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `GEMINI_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to your Google service account JSON file

## 3) Google Cloud setup

Enable Google Speech-to-Text API in your Google Cloud project and ensure service account has access.

## 4) Run server

```bash
npm run dev
```

or

```bash
npm start
```

## 5) Expose local server with ngrok

```bash
ngrok http 3000
```

Use the HTTPS forwarding URL in Twilio Phone Number voice webhook:
- URL: `https://<ngrok-id>.ngrok-free.app/ivr`
- Method: `POST`

## Endpoints

- `POST /ivr` - Entry IVR prompt and gather
- `POST /menu` - Keypress handling
- `POST /record` - Voice recording step
- `POST /recording` - Download recording, STT, Gemini summary
- `POST /api/verification/call` - Trigger outbound verification call (used by backend after officer resolution)
- `POST /ivr/verify` - Verification IVR prompt for citizen
- `POST /ivr/verify/response` - Captures citizen keypress (`1` resolved, `2` reopened) and calls backend callback
- `GET /complaints` - Optional in-memory complaints list
- `GET /health` - Health check

## Officer Resolve -> IVR Verify flow

1. Officer uploads resolution proof in backend (`/api/officer/complaints/:id/resolve`).
2. Backend calls `POST /api/verification/call` on this service.
3. Twilio places call to citizen number and asks for `1` (resolved/verified) or `2` (reopened).
4. This service posts keypress result to backend callback URL.
5. Backend finalizes complaint state:
	- `1` -> `RESOLVED` / `VERIFIED`
	- `2` -> `REOPENED` and remains visible in the reopened, upload proof, and assigned queues

## Notes

- `2` means the complaint is reopened by the IVR callback and stays visible for follow-up handling.
- The backend callback URL should point to the public tunnel URL when testing through ngrok/localtunnel.

- Recording download uses Twilio basic auth (SID + Auth Token).
- The app logs recording URL, transcription, and Gemini summary to console.
