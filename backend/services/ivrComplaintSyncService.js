const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

const IVR_COLLECTION_CANDIDATES = [
  process.env.IVR_CALL_COLLECTION,
  'IVRCALLData',
  'ivr_calls'
].filter(Boolean);

const IVR_DATABASE_CANDIDATES = [
  process.env.IVR_CALL_DATABASE,
  'IVRCALLData'
].filter(Boolean);

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
}

function normalizePhoneNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (raw.startsWith('+')) {
    return raw;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return raw;
}

function isPlaceholderTranscription(value) {
  const text = String(value || '').trim();
  if (!text) {
    return true;
  }

  const normalized = text.toLowerCase();
  return [
    'ટ્રાન્સક્રિપ્શન પ્રક્રિયામાં છે',
    'transcription is in progress',
    'processing_transcription',
    'audio recording captured',
    'ઓડિયો રેકોર્ડિંગ મળી ગયું છે',
    'audio recording received'
  ].some((phrase) => normalized.includes(phrase));
}

function buildAnonymousEmail(recordId, phoneNumber) {
  const digits = String(phoneNumber || '')
    .replace(/\D/g, '')
    .slice(-10) || 'ivr';
  return `ivr-${digits}-${String(recordId || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}@ivr.local`;
}

async function buildUniqueGrievanceId(prefix, record) {
  const base = `${prefix}-${String(record?.id || record?._id || Date.now())}`
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .slice(0, 80);

  let candidate = base;
  let suffix = 1;

  while (await Complaint.exists({ grievance_id: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

async function getIvrCollection() {
  if (!mongoose.connection.db || !mongoose.connection.client) {
    throw new Error('MongoDB connection is not ready');
  }

  const currentDbName = mongoose.connection.db.databaseName;
  const dbCandidates = uniqueStrings([...IVR_DATABASE_CANDIDATES, currentDbName]);
  const collectionCandidates = uniqueStrings(IVR_COLLECTION_CANDIDATES);

  for (const dbName of dbCandidates) {
    const db = mongoose.connection.client.db(dbName);
    const collections = await db.listCollections().toArray();
    const availableNames = new Set(collections.map((entry) => entry.name));
    const selectedName = collectionCandidates.find((name) => availableNames.has(name));

    if (selectedName) {
      return db.collection(selectedName);
    }
  }

  return mongoose.connection.db.collection(collectionCandidates[0] || 'ivr_calls');
}

async function findOrCreateCitizenFromCaller(callerNumber, recordId) {
  const normalizedPhone = normalizePhoneNumber(callerNumber);
  const phoneCandidates = normalizedPhone ? [normalizedPhone, String(callerNumber || '').trim()] : [String(callerNumber || '').trim()];
  let existingUser = null;

  for (const phone of phoneCandidates.filter(Boolean)) {
    existingUser = await User.findOne({ phone });
    if (existingUser) {
      return existingUser;
    }
  }

  const syntheticEmail = buildAnonymousEmail(recordId, normalizedPhone || callerNumber);
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);

  existingUser = await User.findOne({ email: syntheticEmail });
  if (existingUser) {
    return existingUser;
  }

  const user = await User.create({
    name: normalizedPhone ? `IVR Caller ${normalizedPhone.slice(-4)}` : 'IVR Caller',
    email: syntheticEmail,
    phone: normalizedPhone || String(callerNumber || '').trim() || null,
    passwordHash,
    role: 'citizen',
    location: {
      type: 'Point',
      coordinates: [0, 0]
    },
    points: 0
  });

  return user;
}

async function importIvrRecordToComplaint(record) {
  if (!record || isPlaceholderTranscription(record.transcriptionText)) {
    return { skipped: true, reason: 'transcription_not_ready', recordId: record?._id || null };
  }

  const existingComplaint = await Complaint.findOne({
    $or: [
      { ivr_call_id: String(record._id) },
      { grievance_id: String(record.complaint_id || record.complaintId || '').trim() }
    ].filter(Boolean)
  }).lean();

  if (existingComplaint) {
    return { skipped: true, reason: 'already_synced', complaintId: existingComplaint._id, recordId: record._id };
  }

  const callerNumber = normalizePhoneNumber(record.callerNumber);
  const citizen = await findOrCreateCitizenFromCaller(callerNumber || record.callerNumber, record._id);

  const { predictComplaintMetadataFromText } = await import('./groqService.js');
  const metadata = await predictComplaintMetadataFromText(record.transcriptionText || record.geminiSummary || 'IVR complaint');
  const grievanceId = await buildUniqueGrievanceId('IVR', record);
  const createdAt = record.createdAt ? new Date(record.createdAt) : new Date();

  const complaint = await Complaint.create({
    grievance_id: grievanceId,
    title: metadata.title || 'IVR Complaint',
    description: record.transcriptionText || record.geminiSummary || 'Complaint registered through IVR call',
    department: metadata.department || 'General',
    district: null,
    grievance_type: metadata.grievanceType || 'general',
    source: 'IVR_CALL',
    location_status: 'NEEDS_LOCATION',
    location_text: record.geminiSummary || null,
    citizen_phone: callerNumber || null,
    citizen_email: citizen.email || null,
    location: {
      type: 'Point',
      coordinates: [0, 0]
    },
    user_location: {
      type: 'Point',
      coordinates: [0, 0]
    },
    image_location: {
      type: 'Point',
      coordinates: [0, 0]
    },
    ai_classification: {
      detected_class: metadata.grievanceType || null,
      confidence: 1,
      selected_model: 'groq-ivr-text',
      department_from_ai: metadata.department || null,
      decision: 'AUTO_ASSIGNED',
      min_confidence_threshold: 0,
      model_results: [],
      summary: record.geminiSummary || record.transcriptionText || null
    },
    status: 'PENDING',
    created_by: citizen._id,
    assigned_to: null,
    assigned_officer: null,
    verification_status: 'PENDING',
    reopen_flag: 0,
    gps_match_flag: 0,
    photo_uploaded: 0,
    created_at: createdAt,
    scoring: {
      citizen_points_delta: 0,
      department_points_delta: 0,
      score_reason: 'IVR complaint imported from transcription',
      fake_complaint_flag: 0
    },
    ivr_call_id: String(record._id),
    ivr_caller_number: callerNumber || String(record.callerNumber || '').trim() || null,
    ivr_recording_sid: record.recordingSid || null,
    ivr_recording_url: record.recordingUrl || null,
    ivr_transcription_text: record.transcriptionText || null,
    ivr_summary: record.geminiSummary || null,
    ivr_processing_status: record.processingStatus || null
  });

  const collection = await getIvrCollection();
  await collection.updateOne(
    { _id: record._id },
    {
      $set: {
        complaint_id: complaint._id.toString(),
        complaint_created_at: new Date(),
        complaint_grievance_id: complaint.grievance_id,
        complaint_department: complaint.department,
        complaint_status: complaint.status,
        complaint_synced_at: new Date()
      }
    }
  );

  return { skipped: false, complaint };
}

async function syncIvrCallsToComplaints() {
  const collection = await getIvrCollection();
  const records = await collection
    .find({
      $or: [
        { complaint_id: { $exists: false } },
        { complaint_id: null },
        { complaint_id: '' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const imported = [];
  const skipped = [];

  for (const record of records) {
    const result = await importIvrRecordToComplaint(record);
    if (result.skipped) {
      skipped.push(result);
      continue;
    }

    imported.push(result.complaint);
  }

  return {
    imported,
    skipped,
    scanned: records.length
  };
}

async function getImportedIvrComplaints() {
  return Complaint.find({ source: 'IVR_CALL' })
    .sort({ created_at: -1 })
    .lean();
}

module.exports = {
  getImportedIvrComplaints,
  importIvrRecordToComplaint,
  syncIvrCallsToComplaints
};