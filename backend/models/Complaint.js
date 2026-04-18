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
    source: {
      type: String,
      enum: ['APP_IMAGE', 'APP_TEXT', 'IVR_CALL'],
      default: 'APP_IMAGE',
      index: true
    },
    location_status: {
      type: String,
      enum: ['AVAILABLE', 'MISSING', 'NEEDS_IVR_FOLLOWUP'],
      default: 'AVAILABLE',
      index: true
    },
    location_text: {
      type: String,
      trim: true,
      default: null
    },
    citizen_phone: {
      type: String,
      trim: true,
      default: null,
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
        default: undefined
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
    ai_classification: {
      detected_class: {
        type: String,
        default: null
      },
      confidence: {
        type: Number,
        default: 0
      },
      selected_model: {
        type: String,
        default: null
      },
      department_from_ai: {
        type: String,
        default: null
      },
      decision: {
        type: String,
        default: null
      },
      min_confidence_threshold: {
        type: Number,
        default: null
      },
      model_results: {
        type: [Schema.Types.Mixed],
        default: []
      },
      detected_location_text: {
        type: String,
        default: null
      },
      extracted_coordinates: {
        type: [Number],
        default: undefined
      },
      summary: {
        type: String,
        default: null
      }
    },
    ivr_metadata: {
      call_sid: {
        type: String,
        default: null
      },
      recording_url: {
        type: String,
        default: null
      },
      transcript_text: {
        type: String,
        default: null
      },
      followup_call_sid: {
        type: String,
        default: null
      },
      followup_triggered_at: {
        type: Date,
        default: null
      },
      followup_status: {
        type: String,
        enum: ['NOT_REQUIRED', 'PENDING', 'TRIGGERED', 'COLLECTED'],
        default: 'NOT_REQUIRED'
      }
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
    },
    scoring: {
      citizen_points_delta: {
        type: Number,
        default: 0
      },
      department_points_delta: {
        type: Number,
        default: 0
      },
      score_reason: {
        type: String,
        default: null
      },
      fake_complaint_flag: {
        type: Number,
        enum: [0, 1],
        default: 0
      }
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
