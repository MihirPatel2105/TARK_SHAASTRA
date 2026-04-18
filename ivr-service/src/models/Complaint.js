const mongoose = require('mongoose');

const { Schema } = mongoose;

const ComplaintSchema = new Schema(
  {
    grievance_id: String,
    title: String,
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'FAILED', 'REOPENED'],
      default: 'PENDING'
    },
    verification_status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FAILED', 'REOPENED'],
      default: 'PENDING'
    },
    reopen_flag: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    ivr_response: {
      type: Number,
      default: 0
    },
    verified_at: Date,
    citizen_phone: String,
    call_logs: [
      {
        call_sid: String,
        to: String,
        from: String,
        status: String,
        created_at: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    collection: 'complaints',
    versionKey: false
  }
);

module.exports = mongoose.model('Complaint', ComplaintSchema);
