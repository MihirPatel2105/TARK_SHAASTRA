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
- `GET /complaints` - Optional in-memory complaints list
- `GET /health` - Health check

## Notes

- Recording download uses Twilio basic auth (SID + Auth Token).
- The app logs recording URL, transcription, and Gemini summary to console.
