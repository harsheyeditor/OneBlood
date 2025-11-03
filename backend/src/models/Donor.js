import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const donorSchema = new mongoose.Schema({
  donorId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Email is optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  bloodType: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        const age = Math.floor((new Date() - v) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18 && age <= 65;
      },
      message: 'Donor must be between 18 and 65 years old'
    }
  },
  address: {
    type: String,
    required: true,
    maxlength: 500
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
  lastDonation: {
    type: Date,
    default: null
  },
  totalDonations: {
    type: Number,
    default: 0,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  qrSecret: {
    type: String,
    required: true,
    unique: true
  },
  achievements: [{
    type: String,
    enum: [
      'first_donation',
      'life_saver', // 5 donations
      'regular_donor', // monthly donations
      'emergency_hero', // critical donations
      'community_leader', // referral milestones
      'rare_blood', // rare blood type donor
      'dedicated_donor' // 10+ donations
    ]
  }],
  healthMetrics: {
    bloodPressure: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^\d{2,3}\/\d{2,3}$/.test(v);
        },
        message: 'Blood pressure must be in format 120/80'
      }
    },
    ironLevel: {
      type: Number,
      min: 0,
      max: 200,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return v >= 8 && v <= 20; // Normal range for hemoglobin
        },
        message: 'Iron level must be between 8-20 g/dL'
      }
    },
    pulse: {
      type: Number,
      min: 40,
      max: 120,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return v >= 60 && v <= 100; // Normal pulse range
        },
        message: 'Pulse must be between 60-100 bpm'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  notificationPreferences: {
    sms: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  privacySettings: {
    showPhone: {
      type: Boolean,
      default: false
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    shareLocation: {
      type: Boolean,
      default: true
    }
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  responseHistory: [{
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest'
    },
    responded: Boolean,
    responseTime: Number, // in minutes
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
donorSchema.index({ location: '2dsphere' });

// Index for blood type and availability
donorSchema.index({ bloodType: 1, available: 1 });

// Index for last donation date
donorSchema.index({ lastDonation: 1 });

// Index for phone lookup
donorSchema.index({ phone: 1 });

// Middleware to update updatedAt field
donorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if donor is eligible to donate
donorSchema.methods.isEligibleToDonate = function() {
  if (!this.available) return false;

  if (!this.lastDonation) return true;

  const daysSinceLastDonation = Math.floor(
    (new Date() - this.lastDonation) / (1000 * 60 * 60 * 24)
  );

  // Must wait at least 56 days between donations
  return daysSinceLastDonation >= 56;
};

// Method to calculate donor score for matching
donorSchema.methods.calculateMatchScore = function(requestLocation, urgency) {
  let score = 0;

  // Distance score (40% weight)
  const distance = this.calculateDistance(requestLocation);
  const distanceScore = Math.max(0, 100 - (distance / 30) * 100); // 30km max range
  score += distanceScore * 0.4;

  // Availability score (30% weight)
  let availabilityScore = 0;
  if (this.isEligibleToDonate()) {
    const daysSinceLastDonation = this.lastDonation ?
      Math.floor((new Date() - this.lastDonation) / (1000 * 60 * 60 * 24)) : 365;
    availabilityScore = Math.min(100, daysSinceLastDonation / 365 * 100);
  }
  score += availabilityScore * 0.3;

  // Response history score (20% weight)
  const recentResponses = this.responseHistory.slice(-10); // Last 10 responses
  const positiveResponses = recentResponses.filter(r => r.responded).length;
  const responseScore = recentResponses.length > 0 ? (positiveResponses / recentResponses.length) * 100 : 50;
  score += responseScore * 0.2;

  // Urgency multiplier (10% bonus)
  if (urgency === 'critical') {
    score *= 1.1;
  }

  return Math.min(100, score);
};

// Method to calculate distance
donorSchema.methods.calculateDistance = function(otherLocation) {
  const R = 6371; // Earth's radius in km
  const lat1 = this.location.coordinates[1] * Math.PI / 180;
  const lat2 = otherLocation.coordinates[1] * Math.PI / 180;
  const deltaLat = (otherLocation.coordinates[1] - this.location.coordinates[1]) * Math.PI / 180;
  const deltaLon = (otherLocation.coordinates[0] - this.location.coordinates[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Static method to find nearby eligible donors
donorSchema.statics.findNearbyEligible = function(lat, lng, bloodType, radiusKm = 30) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000
      }
    },
    bloodType: bloodType,
    available: true,
    $or: [
      { lastDonation: null },
      { lastDonation: { $lte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } }
    ]
  });
};

// Generate unique donor ID
donorSchema.statics.generateDonorId = function() {
  const prefix = 'DON';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

export default mongoose.model('Donor', donorSchema);