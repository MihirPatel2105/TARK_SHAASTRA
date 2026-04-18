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

### Complaints

- `POST /api/complaints`
- `GET /api/complaints/nearby?lat=..&lng=..&radius=2000`
- `GET /api/complaints/:id`
- `POST /api/complaints/:id/vote`
- `POST /api/complaints/:id/resolve`
- `GET /api/complaints/analytics`

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

### Duplicate detection

When a new complaint is created, the backend checks for the same `grievance_type` within 500 meters. If a match is found, it returns `409` with suggested existing complaints so the citizen can vote instead.

## Notes

- Cloudinary stores the actual image.
- MongoDB stores the image URL and public ID.
- The complaint `location` field is indexed with `2dsphere` for map and nearby queries.
