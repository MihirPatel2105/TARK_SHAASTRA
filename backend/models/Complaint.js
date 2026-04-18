const mongoose = require('mongoose');

const { Schema } = mongoose;

const ComplaintSchema = new Schema(
  {
    grievance_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    grievance_type: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    user_location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    image_location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    resolved_user_location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    resolved_image_location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    image_url: {
      type: String
    },
    image_public_id: {
      type: String
    },
    resolved_image: {
      type: String
    },
    resolved_image_public_id: {
      type: String
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'FAILED', 'REOPENED'],
      default: 'PENDING',
      index: true
    },
    verification_status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FAILED', 'REOPENED'],
      default: 'PENDING',
      index: true
    },
    reopen_flag: {
      type: Number,
      enum: [0, 1],
      default: 0,
      index: true
    },
    votes: {
      type: Number,
      default: 0
    },
    voters: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    gps_match_flag: {
      type: Number,
      default: 0
    },
    photo_uploaded: {
      type: Number,
      default: 0
    },
    ivr_response: {
      type: Number,
      default: 0
    },
    assigned_officer: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    resolved_at: {
      type: Date
    },
    verified_at: {
      type: Date
    }
  },
  {
    versionKey: false
  }
);

ComplaintSchema.index({ location: '2dsphere' });
ComplaintSchema.index({ location: '2dsphere', grievance_type: 1 });
ComplaintSchema.index({ votes: -1, created_at: -1 });
ComplaintSchema.index({ department: 1, status: 1, created_at: -1 });
ComplaintSchema.index({ district: 1, department: 1, verification_status: 1, created_at: -1 });

module.exports = mongoose.model('Complaint', ComplaintSchema);
