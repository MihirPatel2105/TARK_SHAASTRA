const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      default: 'citizen',
      index: true
    },
    department: {
      type: String,
      trim: true,
      default: null,
      required: function requiredDepartmentForOfficer() {
        return this.role === 'officer';
      }
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
UserSchema.index({ role: 1, department: 1 });
UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
