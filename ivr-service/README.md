# IVR Service

Standalone Twilio IVR service for complaint verification.

## What it does

- Triggers outbound Twilio calls after complaint resolution
- Plays IVR prompt: press 1 (verified) or 2 (reopen)
- Saves IVR response in MongoDB complaints collection
- Supports webhook signature validation (toggle via env)

## Setup

1. Copy `.env.example` to `.env`
2. Fill Twilio values and ngrok/public URL
3. Install dependencies:

```bash
npm install
```

4. Run service:

```bash
npm run dev
```

## Endpoints

- `GET /api/ivr/health`
- `POST /api/ivr/calls/trigger`
- `POST /api/ivr/voice`
- `POST /api/ivr/handle-key`

## Trigger call body

```json
{
  "complaintId": "<Mongo complaint _id>",
  "to": "+919726812910"
}
```

## Test

```bash
npm test
```

## Twilio webhook setup

Set Twilio phone number voice webhook to:

`https://<public-url>/api/ivr/voice`

Use ngrok for local testing:

```bash
npx ngrok http 5001
```

## Security note

Do not commit real Twilio credentials. Keep SID and auth token in `.env` only.
