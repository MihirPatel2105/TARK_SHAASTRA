const axios = require('axios');

const IVR_SERVICE_BASE_URL = process.env.IVR_SERVICE_BASE_URL || '';

function buildResult(overrides = {}) {
  return {
    enabled: Boolean(IVR_SERVICE_BASE_URL),
    queued: false,
    call_sid: null,
    message: null,
    error: null,
    ...overrides
  };
}

async function postToIvr(path, payload) {
  if (!IVR_SERVICE_BASE_URL) {
    return buildResult({
      message: 'IVR_SERVICE_BASE_URL is not configured. Skipping remote IVR call trigger.'
    });
  }

  const normalizedBase = IVR_SERVICE_BASE_URL.replace(/\/$/, '');
  const url = `${normalizedBase}${path}`;

  try {
    const response = await axios.post(url, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return buildResult({
      enabled: true,
      queued: true,
      call_sid: response.data?.callSid || response.data?.call_sid || null,
      message: response.data?.message || 'IVR call triggered successfully.'
    });
  } catch (error) {
    return buildResult({
      enabled: true,
      queued: false,
      error: error.response?.data?.message || error.message || 'Failed to trigger IVR call.'
    });
  }
}

async function triggerComplaintVerificationCall({ complaintId, to }) {
  if (!to) {
    return buildResult({
      message: 'Citizen phone is missing. Cannot trigger verification IVR call.'
    });
  }

  return postToIvr('/api/ivr/calls/trigger', {
    complaintId,
    to
  });
}

async function triggerLocationCollectionCall({ complaintId, to }) {
  if (!to) {
    return buildResult({
      message: 'Citizen phone is missing. Cannot trigger location follow-up IVR call.'
    });
  }

  return postToIvr('/api/ivr/calls/trigger', {
    complaintId,
    to,
    reason: 'LOCATION_COLLECTION'
  });
}

module.exports = {
  triggerComplaintVerificationCall,
  triggerLocationCollectionCall
};
