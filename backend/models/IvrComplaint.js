const mongoose = require('mongoose');

const { Schema } = mongoose;

const IvrComplaintSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true
    },
    audio_url: {
      type: String,
      required: true
    },
    twilio_call_sid: {
      type: String,
      default: null,
      index: true
    },
    twilio_recording_sid: {
      type: String,
      default: null,
      index: true
    },
    recording_duration_sec: {
      type: Number,
      default: null
    },
    transcript: {
      type: String,
      default: null
    },
    transcript_status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    transcript_error: {
      type: String,
      default: null
    },
    transcription_started_at: {
      type: Date,
      default: null
    },
    transcription_completed_at: {
      type: Date,
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model('IvrComplaint', IvrComplaintSchema);