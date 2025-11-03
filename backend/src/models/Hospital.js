import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
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
  password: {
    type: String,
    required: true,
    minlength: 6
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
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String, // URLs to stored documents
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  bloodStock: {
    'A+': {
      type: Number,
      default: 0,
      min: 0
    },
    'A-': {
      type: Number,
      default: 0,
      min: 0
    },
    'B+': {
      type: Number,
      default: 0,
      min: 0
    },
    'B-': {
      type: Number,
      default: 0,
      min: 0
    },
    'O+': {
      type: Number,
      default: 0,
      min: 0
    },
    'O-': {
      type: Number,
      default: 0,
      min: 0
    },
    'AB+': {
      type: Number,
      default: 0,
      min: 0
    },
    'AB-': {
      type: Number,
      default: 0,
      min: 0
    }
  },
  serviceRadius: {
    type: Number,
    required: true,
    default: 50, // km
    min: 5,
    max: 200
  },
  averageResponseTime: {
    type: Number,
    default: 15, // minutes
    min: 1
  },
  capacity: {
    maxRequestsPerHour: {
      type: Number,
      default: 20,
      min: 1
    },
    maxConcurrentDonations: {
      type: Number,
      default: 10,
      min: 1
    }
  },
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  contactPerson: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    }
  },
  emergencyContact: {
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    }
  },
  services: [{
    type: String,
    enum: [
      'emergency_blood',
      'scheduled_donation',
      'mobile_collection',
      'blood_testing',
      'component_separation',
      'emergency_transport'
    ]
  }],
  specialties: [{
    type: String,
    enum: [
      'general_medicine',
      'emergency_care',
      'surgery',
      'pediatrics',
      'maternity',
      'cardiology',
      'trauma_care'
    ]
  }],
  statistics: {
    totalRequestsHandled: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    successfulMatches: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  settings: {
    autoAcceptCriticalRequests: {
      type: Boolean,
      default: false
    },
    notifyOnNewRequests: {
      type: Boolean,
      default: true
    },
    shareDataWithPartners: {
      type: Boolean,
      default: false
    }
  },
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
hospitalSchema.index({ location: '2dsphere' });

// Index for verification status
hospitalSchema.index({ verified: 1 });

// Index for email lookup
hospitalSchema.index({ email: 1 });

// Middleware to hash password before saving
hospitalSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Middleware to update updatedAt field
hospitalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if hospital is open
hospitalSchema.methods.isOpen = function() {
  const now = new Date();
  const day = now.toLocaleLowerCase().slice(0, 3);
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const todayHours = this.operatingHours[day];
  if (todayHours && todayHours.closed) return false;

  if (!todayHours || !todayHours.open || !todayHours.close) return true; // Assume 24/7

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

// Method to update blood stock
hospitalSchema.methods.updateBloodStock = function(bloodType, change) {
  if (this.bloodStock.hasOwnProperty(bloodType)) {
    this.bloodStock[bloodType] = Math.max(0, this.bloodStock[bloodType] + change);
    return true;
  }
  return false;
};

// Method to get total blood stock
hospitalSchema.methods.getTotalBloodStock = function() {
  return Object.values(this.bloodStock).reduce((total, amount) => total + amount, 0);
};

// Method to check if can fulfill request
hospitalSchema.methods.canFulfillRequest = function(bloodType, units = 1) {
  return this.bloodStock[bloodType] >= units && this.isOpen();
};

// Method to calculate distance from a point
hospitalSchema.methods.calculateDistance = function(lat, lng) {
  const R = 6371; // Earth's radius in km
  const lat1 = this.location.coordinates[1] * Math.PI / 180;
  const lat2 = lat * Math.PI / 180;
  const deltaLat = (lat - this.location.coordinates[1]) * Math.PI / 180;
  const deltaLon = (lng - this.location.coordinates[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Method to update statistics
hospitalSchema.methods.updateStatistics = function(responseTime, successful = true) {
  const stats = this.statistics;
  stats.totalRequestsHandled += 1;

  if (successful) {
    stats.successfulMatches += 1;
  }

  // Update average response time
  if (responseTime) {
    const totalResponseTime = stats.averageResponseTime * (stats.totalRequestsHandled - 1) + responseTime;
    stats.averageResponseTime = totalResponseTime / stats.totalRequestsHandled;
  }

  stats.lastUpdated = new Date();
};

// Static method to find nearby hospitals
hospitalSchema.statics.findNearby = function(lat, lng, radiusKm = 50, verifiedOnly = true) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000
      }
    }
  };

  if (verifiedOnly) {
    query.verified = true;
  }

  return this.find(query).sort({ averageResponseTime: 1 });
};

// Method to compare password
hospitalSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Hospital', hospitalSchema);