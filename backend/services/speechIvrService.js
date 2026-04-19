const axios = require('axios');

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function buildCallbackUrl(complaintId) {
  const backendBase = trimTrailingSlash(process.env.BACKEND_PUBLIC_URL || process.env.NGROK_URL);
  if (!backendBase) {
    throw new Error('BACKEND_PUBLIC_URL or NGROK_URL is required to receive IVR callbacks');
  }

  return `${backendBase}/api/complaints/${encodeURIComponent(complaintId)}/ivr-response`;
}

async function triggerResolutionVerificationCall({ complaintId, citizenPhone }) {
  const speechIvrBaseUrl = trimTrailingSlash(process.env.SPEECH_TO_TEXT_IVR_URL || 'http://localhost:3000');
  const callbackUrl = buildCallbackUrl(complaintId);

  const response = await axios.post(
    `${speechIvrBaseUrl}/api/verification/call`,
    {
      complaintId,
      citizenPhone,
      callbackUrl
    },
    {
      timeout: Number(process.env.IVR_TRIGGER_TIMEOUT_MS || 15000),
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.IVR_CALLBACK_SECRET ? { 'x-ivr-secret': process.env.IVR_CALLBACK_SECRET } : {})
      }
    }
  );

  return response.data;
}

module.exports = {
  triggerResolutionVerificationCall
};
