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

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example`.

3. Start MongoDB locally or point `MONGODB_URI` to your Atlas cluster.

4. Run the server:

```bash
npm run dev
```

## API

### Health

- `GET /health`

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

The backend validates GPS using Haversine distance between officer location and complaint location.
If distance is <= 100m then `gps_match_flag = 1`, else `gps_match_flag = 0`.

## Request examples

### Create complaint

Use `multipart/form-data` and include the image in the `image` field.

Fields:

- `grievance_id`
- `title`
- `description`
- `department`
- `grievance_type`
- `lat`
- `lng`
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

### Duplicate detection

When a new complaint is created, the backend checks for the same `grievance_type` within 500 meters. If a match is found, it returns `409` with suggested existing complaints so the citizen can vote instead.

## Notes

- Cloudinary stores the actual image.
- MongoDB stores the image URL and public ID.
- The complaint `location` field is indexed with `2dsphere` for map and nearby queries.
