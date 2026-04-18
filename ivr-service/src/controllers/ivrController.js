const twilio = require('twilio');
const Complaint = require('../models/Complaint');
const asyncHandler = require('../utils/asyncHandler');
const { getTwilioClient } = require('../services/twilioClient');

function getPublicBaseUrl() {
  if (!process.env.PUBLIC_BASE_URL) {
    throw new Error('PUBLIC_BASE_URL is required');
  }

  return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
}

const health = (req, res) => {
  res.json({ status: 'ok' });
};

const triggerCall = asyncHandler(async (req, res) => {
  const { complaintId, to } = req.body;

  if (!complaintId || !to) {
    res.status(400);
    throw new Error('complaintId and to are required');
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    res.status(500);
    throw new Error('TWILIO_FROM_NUMBER is required');
  }

  const baseUrl = getPublicBaseUrl();
  const client = getTwilioClient();

  const call = await client.calls.create({
    url: `${baseUrl}/api/ivr/voice?complaintId=${complaint._id}`,
    to,
    from
  });

  complaint.citizen_phone = to;
  complaint.call_logs = complaint.call_logs || [];
  complaint.call_logs.push({
    call_sid: call.sid,
    to,
    from,
    status: 'initiated'
  });
  await complaint.save();

  res.status(201).json({
    message: 'IVR call triggered',
    call_sid: call.sid,
    complaint_id: complaint._id
  });
});

const voicePrompt = asyncHandler(async (req, res) => {
  const complaintId = req.query.complaintId;

  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    numDigits: 1,
    action: `/api/ivr/handle-key?complaintId=${complaintId}`,
    method: 'POST',
    timeout: 7
  });

  gather.say('Press 1 if your complaint is resolved. Press 2 if not resolved.');
  twiml.say('No input received. We will retry verification later.');

  res.type('text/xml');
  res.send(twiml.toString());
});

const handleKey = asyncHandler(async (req, res) => {
  const complaintId = req.query.complaintId;
  const digit = req.body.Digits;
  const callSid = req.body.CallSid;

  if (!complaintId) {
    res.status(400);
    throw new Error('complaintId is required');
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }

  const twiml = new twilio.twiml.VoiceResponse();

  if (digit === '1') {
    complaint.ivr_response = 1;
    complaint.verification_status = 'VERIFIED';
    complaint.status = 'VERIFIED';
    complaint.reopen_flag = 0;
    complaint.verified_at = new Date();
    twiml.say('Thank you. Complaint marked as verified.');
  } else if (digit === '2') {
    complaint.ivr_response = 2;
    complaint.verification_status = 'REOPENED';
    complaint.status = 'REOPENED';
    complaint.reopen_flag = 1;
    twiml.say('Thank you. Complaint has been reopened for further action.');
  } else {
    complaint.ivr_response = 0;
    twiml.say('Invalid input. We will contact you again.');
  }

  complaint.call_logs = complaint.call_logs || [];
  complaint.call_logs.push({
    call_sid: callSid,
    to: complaint.citizen_phone,
    from: process.env.TWILIO_FROM_NUMBER,
    status: digit || 'no-input'
  });

  await complaint.save();

  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = {
  health,
  triggerCall,
  voicePrompt,
  handleKey
};
