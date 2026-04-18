const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      default: 'citizen',
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
        default: [0, 0]
      }
    },
    points: {
      type: Number,
      default: 0
    }
  },
  {
    versionKey: false
  }
);

UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
