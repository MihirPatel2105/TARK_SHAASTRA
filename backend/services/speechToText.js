const axios = require('axios');
const IvrComplaint = require('../models/IvrComplaint');

const HF_API = process.env.HF_SPEECH_MODEL_URL || 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
const HF_RETRIES = Number(process.env.HF_STT_RETRIES || 3);
const HF_RETRY_DELAY_MS = Number(process.env.HF_STT_RETRY_DELAY_MS || 5000);
const MAX_AUDIO_SECONDS = Number(process.env.IVR_MAX_TRANSCRIBE_SECONDS || 60);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeErrorMessage(error) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unknown transcription error';
}

function shouldRetry(error) {
  const status = error?.response?.status;
  const message = String(normalizeErrorMessage(error)).toLowerCase();

  return status === 503 || message.includes('model is loading') || message.includes('currently loading');
}

async function callHF(requestConfig, retries = HF_RETRIES) {
  try {
    return await axios(requestConfig);
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      await sleep(HF_RETRY_DELAY_MS);
      return callHF(requestConfig, retries - 1);
    }

    throw error;
  }
}

async function downloadAudioBuffer(audioUrl) {
  try {
    const response = await axios({
      url: audioUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 45000
    });
    return Buffer.from(response.data);
  } catch (error) {
    if (audioUrl.endsWith('.wav')) {
      throw error;
    }

    const fallback = await axios({
      url: `${audioUrl}.wav`,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 45000
    });
    return Buffer.from(fallback.data);
  }
}

async function markFailed(ivrComplaintId, errorMessage) {
  await IvrComplaint.findByIdAndUpdate(ivrComplaintId, {
    transcript_status: 'FAILED',
    transcript_error: errorMessage,
    transcription_completed_at: new Date()
  });
}

async function speechToText(ivrComplaintId, audioUrl, recordingDurationSec) {
  if (!process.env.HF_API_KEY) {
    await markFailed(ivrComplaintId, 'HF_API_KEY is not configured');
    return;
  }

  if (Number.isFinite(recordingDurationSec) && recordingDurationSec > MAX_AUDIO_SECONDS) {
    await markFailed(ivrComplaintId, `Audio duration ${recordingDurationSec}s exceeds max ${MAX_AUDIO_SECONDS}s`);
    return;
  }

  await IvrComplaint.findByIdAndUpdate(ivrComplaintId, {
    transcript_status: 'PROCESSING',
    transcript_error: null,
    transcription_started_at: new Date()
  });

  try {
    const audioBuffer = await downloadAudioBuffer(audioUrl);

    const hfResponse = await callHF({
      url: HF_API,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': 'audio/wav'
      },
      data: audioBuffer,
      timeout: 120000
    });

    const transcript = typeof hfResponse?.data?.text === 'string' && hfResponse.data.text.trim().length
      ? hfResponse.data.text.trim()
      : 'No speech detected';

    await IvrComplaint.findByIdAndUpdate(ivrComplaintId, {
      transcript,
      transcript_status: 'COMPLETED',
      transcript_error: null,
      transcription_completed_at: new Date()
    });
  } catch (error) {
    await markFailed(ivrComplaintId, normalizeErrorMessage(error));
  }
}

module.exports = {
  speechToText,
  callHF
};