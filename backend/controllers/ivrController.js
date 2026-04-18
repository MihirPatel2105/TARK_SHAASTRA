const axios = require('axios');
const twilio = require('twilio');
const IvrComplaint = require('../models/IvrComplaint');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBufferToCloudinary } = require('../services/cloudinaryService');
const { speechToText } = require('../services/speechToText');

const LANGUAGE = 'gu-IN';

const voicePrompt = asyncHandler(async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/api/ivr/handle-key',
    method: 'POST',
    timeout: 7
  });

  gather.say(
    { language: LANGUAGE },
    'તમારી ફરિયાદ નોંધાવવા માટે 1 દબાવો'
  );

  twiml.say({ language: LANGUAGE }, 'ઇનપુટ મળ્યો નથી. ફરીથી કોલ કરો.');

  res.type('text/xml');
  res.send(twiml.toString());
});

const handleKey = asyncHandler(async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    twiml.say({ language: LANGUAGE }, 'કૃપા કરીને તમારી ફરિયાદ બોલો.');
    twiml.record({
      maxLength: 60,
      playBeep: true,
      action: '/api/ivr/save-recording',
      method: 'POST'
    });
  } else {
    twiml.say({ language: LANGUAGE }, 'ખોટો વિકલ્પ. ફરી પ્રયાસ કરો.');
    twiml.redirect({ method: 'POST' }, '/api/ivr/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

const saveRecording = asyncHandler(async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  const phone = req.body.From;
  const callSid = req.body.CallSid || null;
  const recordingSid = req.body.RecordingSid || null;
  const recordingDuration = Number(req.body.RecordingDuration);

  if (!recordingUrl || !phone) {
    res.status(400);
    throw new Error('RecordingUrl and From are required');
  }

  const twilioMediaResponse = await axios({
    url: `${recordingUrl}.wav`,
    method: 'GET',
    responseType: 'arraybuffer',
    auth: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
      : undefined
  });

  const uploadResult = await uploadBufferToCloudinary(Buffer.from(twilioMediaResponse.data), {
    folder: 'ivr/recordings',
    resourceType: 'video',
    format: 'wav',
    publicId: `ivr_${Date.now()}_${recordingSid || 'recording'}`
  });

  const complaint = await IvrComplaint.create({
    phone,
    audio_url: uploadResult.secure_url,
    twilio_call_sid: callSid,
    twilio_recording_sid: recordingSid,
    recording_duration_sec: Number.isFinite(recordingDuration) ? recordingDuration : null,
    transcript_status: 'PENDING'
  });

  // Avoid blocking Twilio webhook response; transcription runs in background.
  setImmediate(() => {
    speechToText(complaint._id, uploadResult.secure_url, Number.isFinite(recordingDuration) ? recordingDuration : null)
      .catch((error) => {
        console.error('Speech-to-text background job failed:', error?.message || error);
      });
  });

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ language: LANGUAGE }, 'તમારી ફરિયાદ નોંધાઈ ગઈ છે. આભાર.');

  res.type('text/xml');
  res.send(twiml.toString());
});

const health = (req, res) => {
  res.json({ status: 'ok', service: 'ivr-recording' });
};

const listIvrComplaints = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.status) {
    query.transcript_status = String(req.query.status).toUpperCase();
  }

  if (req.query.phone) {
    query.phone = { $regex: String(req.query.phone), $options: 'i' };
  }

  const [total, complaints] = await Promise.all([
    IvrComplaint.countDocuments(query),
    IvrComplaint.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  res.json({
    page,
    limit,
    total,
    count: complaints.length,
    complaints
  });
});

const retryTranscription = asyncHandler(async (req, res) => {
  const complaint = await IvrComplaint.findById(req.params.id);

  if (!complaint) {
    res.status(404);
    throw new Error('IVR complaint not found');
  }

  complaint.transcript_status = 'PENDING';
  complaint.transcript_error = null;
  await complaint.save();

  setImmediate(() => {
    speechToText(complaint._id, complaint.audio_url, complaint.recording_duration_sec)
      .catch((error) => {
        console.error('Retry speech-to-text job failed:', error?.message || error);
      });
  });

  res.json({
    message: 'Transcription retry queued',
    complaint_id: complaint._id
  });
});

module.exports = {
  health,
  voicePrompt,
  handleKey,
  saveRecording,
  listIvrComplaints,
  retryTranscription
};