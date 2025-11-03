import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema({
  requesterPhone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  requesterName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 &&
                 v[0] >= -180 && v[0] <= 180 &&
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  bloodType: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  },
  urgency: {
    type: String,
    required: true,
    enum: ['critical', 'urgent', 'normal'],
    default: 'normal'
  },
  patientCondition: {
    type: String,
    required: false,
    maxlength: 500
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    default: null
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'completed', 'cancelled'],
    default: 'pending'
  },
  acceptedHospitals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  }],
  matchedDonors: [{
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor'
    },
    matchScore: Number,
    contactedAt: Date,
    response: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
});

// Index for geospatial queries
bloodRequestSchema.index({ location: '2dsphere' });

// Index for urgent requests
bloodRequestSchema.index({ urgency: 1, status: 1, createdAt: -1 });

// Index for phone number lookup
bloodRequestSchema.index({ requesterPhone: 1, createdAt: -1 });

// Middleware to update updatedAt field
bloodRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for time remaining
bloodRequestSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const expiresAt = new Date(this.expiresAt);
  return Math.max(0, Math.floor((expiresAt - now) / 1000 / 60)); // minutes
});

// Method to check if request is expired
bloodRequestSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Static method to find nearby requests
bloodRequestSchema.statics.findNearby = function(lat, lng, radiusKm = 50) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000 // Convert to meters
      }
    },
    status: { $in: ['pending', 'accepted'] },
    expiresAt: { $gt: new Date() }
  }).sort({ urgency: -1, createdAt: -1 });
};

export default mongoose.model('BloodRequest', bloodRequestSchema);