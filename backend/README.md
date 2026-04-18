# Tark Shaastra Backend

Production-style starter backend for citizen complaints with:

- MongoDB geospatial queries for nearby complaints
- Duplicate detection within 500m
- Vote-on-complaint workflow
- Cloudinary image uploads stored in MongoDB as metadata
- Complaint resolution and verification
- Analytics endpoint for admin dashboards

## Stack

- Node.js + Express
- MongoDB + Mongoose
- Cloudinary for image storage
- Multer for file uploads
- EXIF GPS parsing with `exif-parser`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example`.

Required auth env var:

- `JWT_SECRET`

3. Start MongoDB locally or point `MONGODB_URI` to your Atlas cluster.

4. Run the server:

```bash
npm run dev
```

## API

- JWT auth with citizen signup + admin-created officers

### Health

- `GET /health`
- `GET /api/ivr/health`

### IVR Complaint Recording (Twilio)

- `POST /api/ivr/voice` (Twilio Voice webhook)
- `POST /api/ivr/handle-key` (DTMF key handling)
- `POST /api/ivr/save-recording` (recording callback)
- `GET /api/ivr/complaints` (list IVR recordings + transcript state)
- `POST /api/ivr/complaints/:id/retry-transcription` (queue failed/pending transcription again)

Flow:

- Caller hears Gujarati prompt and presses `1`.
- System records voice (`maxLength: 60`).
- Recording is fetched from Twilio, uploaded to Cloudinary, and saved in MongoDB collection `ivrcomplaints`.
- After upload, background transcription is triggered with HuggingFace Whisper and transcript is stored in the same `ivrcomplaints` document.

Required env vars:

- `TWILIO_ACCOUNT_SID` (needed when Twilio recording URL requires auth)
- `TWILIO_AUTH_TOKEN` (needed when Twilio recording URL requires auth)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `HF_API_KEY` (HuggingFace token for Whisper transcription)

Optional STT env vars:

- `HF_SPEECH_MODEL_URL` (default: `openai/whisper-large-v3` inference endpoint)
- `HF_STT_RETRIES` (default: `3`)
- `HF_STT_RETRY_DELAY_MS` (default: `5000`)
- `IVR_MAX_TRANSCRIBE_SECONDS` (default: `60`)

Transcription status values in `ivrcomplaints`:

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

### Auth

- `POST /api/auth/signup` (citizen only)
- `POST /api/auth/login`

Citizen signup requires:

- `name`
- `email`
- `password`

### Admin Officer Creation

Send admin JWT in `Authorization: Bearer <token>` or legacy `x-user-id` header.

- `POST /api/admin/officers`

Officer creation requires:

- `name`
- `email`
- `password`
- `department`
Note: this project now uses `/api/auth/signup` for citizen sign-up and `/api/admin/officers` for officer creation.

Legacy `/api/users` now maps to citizen signup as an alias.

- `x-user-id: <OFFICER_ID>`
- or `Authorization: Bearer <JWT>`
- `x-user-id: <ADMIN_ID>`
- or `Authorization: Bearer <JWT>`

### Users

- `POST /api/users`

For officers, `department` is required (example: `Roads`, `Water`, `Electricity`, `Sanitation`).

### Complaints

- `POST /api/complaints`
- `GET /api/complaints/nearby?lat=..&lng=..&radius=2000`
- `GET /api/complaints/:id`
- `POST /api/complaints/:id/vote`
- `POST /api/complaints/:id/resolve`
- `GET /api/complaints/analytics`

### Officer Dashboard APIs

Send officer user ID in header: `x-user-id: <OFFICER_ID>`

- `GET /api/officer/complaints`
- `GET /api/officer/complaints?status=PENDING`
- `POST /api/officer/complaints/:id/start`
- `POST /api/officer/complaints/:id/resolve`

Officer resolve uses `multipart/form-data` with:

- `image` (required proof image)
- `officer_lat` (required)
- `officer_lng` (required)

The backend validates GPS using Haversine distance and image EXIF metadata.

- officer location to complaint must be <= 100m
- resolved image EXIF location to complaint must be <= 100m
- otherwise upload is rejected

### Admin Panel APIs

Send admin user ID in header: `x-user-id: <ADMIN_ID>`

- `GET /api/admin/complaints`
- `GET /api/admin/complaints/overlay` (compact map overlay payload)
- `GET /api/admin/complaints?district=Surat&department=Roads&status=FAILED`
- `GET /api/admin/complaints/:id`
- `POST /api/admin/complaints/:id/verify`
- `GET /api/admin/dashboard`
- `GET /api/admin/report` (CSV export)
- `GET /api/admin/dataset/info`

Admin complaint filters:

- `district`
- `department`
- `status`
- `verification_status`
- `reopen_flag`
- `grievance_type`

The overlay endpoint returns only what the map needs:

- complaint point
- image point
- line points
- marker status/color
- GPS verification flags

Dashboard includes:

- KPI cards (`total`, `verified`, `failed`, `reopened`, `reopen_rate_percent`)
- district-wise report
- department-wise report
- department ranking
- verification analysis
- status analysis
- monthly trend
- heatmap points
- insights (`ivr_response = 2`, GPS mismatch, no-photo impact)

## Request examples

### Create complaint

Use `multipart/form-data` and include the image in the `image` field.

GPS anti-tamper requirement:

- `image` must include EXIF GPS metadata
- `lat` and `lng` must come from browser geolocation
- backend compares browser GPS with image GPS and stores `gps_match_flag`

Fields:

- `grievance_id`
- `title`
- `description`
- `department`
- `grievance_type`
- `lat`
- `lng`
- `image` (required)
- `created_by` optional
- `assign_officer_id` optional
- `force_create` optional

If `department` is not provided, backend auto-maps from `grievance_type` for:

- `Pothole -> Roads`
- `Leakage -> Water`
- `Power Cut -> Electricity`
- `Garbage -> Sanitation`

### Vote complaint

```json
{
  "userId": "USER_OBJECT_ID"
}
```

### Resolve complaint

Use `multipart/form-data` if attaching an officer image.

Fields:

- `officerId`
- `ivr_response`
- `gps_match_flag`
- `photo_uploaded`
- `image` optional

This route is retained for existing system-level resolution flow.
For officer dashboard flow, use `/api/officer/complaints/:id/resolve`.

### Admin Verify complaint

`POST /api/admin/complaints/:id/verify`

Optional body:

```json
{
  "verification_status": "FAILED"
}
```

Allowed values: `VERIFIED`, `FAILED`, `REOPENED`.
If omitted, backend computes verification from IVR + GPS + photo flags.

### Duplicate detection

When a new complaint is created, the backend checks for the same `grievance_type` within 500 meters. If a match is found, it returns `409` with suggested existing complaints so the citizen can vote instead.

## Notes

- Cloudinary stores the actual image.
- MongoDB stores the image URL and public ID.
- The complaint `location` field is indexed with `2dsphere` for map and nearby queries.
- `TS-PS2.csv` appears to be a ZIP/XLSX container despite `.csv` extension; use `/api/admin/dataset/info` to verify file signature.

Recommended frontend input for mobile camera capture:

```html
<input type="file" accept="image/*" capture="environment" />
```
