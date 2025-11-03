import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import Hospital from '../models/Hospital.js';
import BloodRequest from '../models/BloodRequest.js';
import Donor from '../models/Donor.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Rate limiting for hospital registration
const hospitalRegistrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 registration attempts per day per IP
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again tomorrow.'
  }
});

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req) => req.body.email || req.ip,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.'
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// JWT generation
const generateToken = (hospitalId, type = 'hospital') => {
  return jwt.sign(
    { id: hospitalId, type },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// POST /api/hospitals/register - Register new hospital
router.post('/register',
  hospitalRegistrationLimiter,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Name must be between 2 and 200 characters'),
    body('email')
      .isEmail()
      .withMessage('Invalid email format'),
    body('phone')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('address')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Address must be between 10 and 500 characters'),
    body('location.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('location.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('licenseNumber')
      .trim()
      .isLength({ min: 5, max: 50 })
      .withMessage('License number must be between 5 and 50 characters'),
    body('contactPerson.name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Contact person name is required'),
    body('contactPerson.position')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Contact person position is required'),
    body('contactPerson.phone')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid contact person phone number'),
    body('emergencyContact.phone')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid emergency contact phone number'),
    body('emergencyContact.email')
      .isEmail()
      .withMessage('Invalid emergency contact email')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name, email, phone, password, address, location,
        licenseNumber, contactPerson, emergencyContact,
        serviceRadius, operatingHours, services, specialties
      } = req.body;

      // Check if hospital already exists
      const existingHospital = await Hospital.findOne({
        $or: [{ email }, { phone }, { licenseNumber }]
      });

      if (existingHospital) {
        return res.status(400).json({
          success: false,
          error: 'Hospital with this email, phone, or license number already exists'
        });
      }

      // Create new hospital (unverified by default)
      const hospital = new Hospital({
        name,
        email,
        phone,
        password, // Will be hashed by pre-save middleware
        address,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        licenseNumber,
        contactPerson,
        emergencyContact,
        serviceRadius: serviceRadius || 50,
        operatingHours: operatingHours || {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '09:00', close: '18:00', closed: true }
        },
        services: services || ['emergency_blood', 'scheduled_donation'],
        specialties: specialties || ['general_medicine', 'emergency_care'],
        verified: false // Requires admin verification
      });

      await hospital.save();

      // Generate JWT token
      const token = generateToken(hospital._id);

      res.status(201).json({
        success: true,
        data: {
          hospital: {
            id: hospital._id,
            name: hospital.name,
            email: hospital.email,
            phone: hospital.phone,
            address: hospital.address,
            verified: hospital.verified,
            createdAt: hospital.createdAt
          },
          token
        },
        message: 'Hospital registration successful! Your account is pending verification.'
      });

    } catch (error) {
      console.error('Error registering hospital:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register hospital. Please try again.'
      });
    }
  }
);

// POST /api/hospitals/login - Hospital login
router.post('/login',
  loginLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email format'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find hospital by email
      const hospital = await Hospital.findOne({ email });
      if (!hospital) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Check password
      const isPasswordValid = await hospital.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Check if hospital is verified
      if (!hospital.verified) {
        return res.status(403).json({
          success: false,
          error: 'Hospital account is pending verification'
        });
      }

      // Generate JWT token
      const token = generateToken(hospital._id);

      res.json({
        success: true,
        data: {
          hospital: {
            id: hospital._id,
            name: hospital.name,
            email: hospital.email,
            phone: hospital.phone,
            address: hospital.address,
            verified: hospital.verified,
            bloodStock: hospital.bloodStock
          },
          token
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Error during hospital login:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.'
      });
    }
  }
);

// GET /api/hospitals/dashboard - Get hospital dashboard data
router.get('/dashboard',
  async (req, res) => {
    try {
      // This route should be protected by authentication middleware
      // For now, we'll accept hospitalId in query (in production, use JWT)
      const { hospitalId } = req.query;

      if (!hospitalId) {
        return res.status(400).json({
          success: false,
          error: 'Hospital ID is required'
        });
      }

      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found'
        });
      }

      if (!hospital.verified) {
        return res.status(403).json({
          success: false,
          error: 'Hospital is not verified'
        });
      }

      // Get active requests in service area
      const activeRequests = await BloodRequest.findNearby(
        hospital.location.coordinates[1],
        hospital.location.coordinates[0],
        hospital.serviceRadius
      ).populate('matchedDonors.donorId', 'name bloodType totalDonations');

      // Get recent completed requests for this hospital
      const recentCompleted = await BloodRequest.find({
        hospitalId: hospital._id,
        status: 'completed',
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).sort({ updatedAt: -1 }).limit(10);

      // Get donor availability in area
      const availableDonors = await Donor.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: hospital.location.coordinates
            },
            maxDistance: hospital.serviceRadius * 1000,
            spherical: true,
            distanceField: 'distance'
          }
        },
        {
          $match: {
            available: true,
            $or: [
              { lastDonation: null },
              { lastDonation: { $lte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } }
            ]
          }
        },
        {
          $group: {
            _id: '$bloodType',
            count: { $sum: 1 },
            averageDistance: { $avg: '$distance' }
          }
        }
      ]);

      // Calculate statistics
      const totalRequests = activeRequests.length;
      const criticalRequests = activeRequests.filter(r => r.urgency === 'critical').length;
      const urgentRequests = activeRequests.filter(r => r.urgency === 'urgent').length;

      res.json({
        success: true,
        data: {
          hospital: {
            id: hospital._id,
            name: hospital.name,
            bloodStock: hospital.bloodStock,
            totalBloodStock: hospital.getTotalBloodStock(),
            serviceRadius: hospital.serviceRadius,
            averageResponseTime: hospital.averageResponseTime
          },
          requests: {
            active: activeRequests.map(req => ({
              id: req._id,
              requesterName: req.requesterName,
              bloodType: req.bloodType,
              urgency: req.urgency,
              createdAt: req.createdAt,
              timeRemaining: req.timeRemaining,
              matchedDonors: req.matchedDonors.length
            })),
            total: totalRequests,
            critical: criticalRequests,
            urgent: urgentRequests,
            recentCompleted: recentCompleted.map(req => ({
              id: req._id,
              bloodType: req.bloodType,
              completedAt: req.updatedAt
            }))
          },
          donors: {
            availableByType: availableDonors.reduce((acc, donor) => {
              acc[donor._id] = {
                count: donor.count,
                averageDistance: Math.round(donor.averageDistance / 1000 * 10) / 10 // km, 1 decimal
              };
              return acc;
            }, {}),
            totalAvailable: availableDonors.reduce((sum, donor) => sum + donor.count, 0)
          },
          statistics: hospital.statistics
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data'
      });
    }
  }
);

// PUT /api/hospitals/:id/bloodstock - Update blood stock levels
router.put('/:id/bloodstock',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid hospital ID'),
    body('bloodType')
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
      .withMessage('Invalid blood type'),
    body('change')
      .isInt({ min: -1000, max: 1000 })
      .withMessage('Change must be between -1000 and 1000')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { bloodType, change, operation = 'add' } = req.body;

      const hospital = await Hospital.findById(id);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found'
        });
      }

      // Update blood stock
      const updated = hospital.updateBloodStock(bloodType, change);
      if (!updated) {
        return res.status(400).json({
          success: false,
          error: 'Invalid blood type'
        });
      }

      await hospital.save();

      res.json({
        success: true,
        data: {
          bloodType,
          previousStock: hospital.bloodStock[bloodType] - change,
          currentStock: hospital.bloodStock[bloodType],
          change: change,
          totalStock: hospital.getTotalBloodStock()
        },
        message: 'Blood stock updated successfully'
      });

    } catch (error) {
      console.error('Error updating blood stock:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update blood stock'
      });
    }
  }
);

// GET /api/hospitals/nearby - Get nearby hospitals
router.get('/nearby',
  [
    query('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    query('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    query('radius')
      .optional()
      .isFloat({ min: 1, max: 200 })
      .withMessage('Radius must be between 1 and 200 km')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { lat, lng, radius = 50 } = req.query;

      const hospitals = await Hospital.findNearby(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius),
        true // verified only
      ).select('name address phone bloodStock serviceRadius averageResponseTime');

      // Calculate distance and additional info for each hospital
      const hospitalsWithDistance = hospitals.map(hospital => {
        const hospitalObj = hospital.toObject();
        const distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          hospital.location.coordinates[1], hospital.location.coordinates[0]
        );

        hospitalObj.distance = Math.round(distance * 10) / 10;
        hospitalObj.isOpen = hospital.isOpen();
        hospitalObj.totalBloodStock = hospital.getTotalBloodStock();
        delete hospitalObj.location; // Remove location data for privacy

        return hospitalObj;
      });

      // Sort by distance
      hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

      res.json({
        success: true,
        data: {
          hospitals: hospitalsWithDistance,
          total: hospitalsWithDistance.length,
          searchArea: {
            center: { lat: parseFloat(lat), lng: parseFloat(lng) },
            radius: parseFloat(radius)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching nearby hospitals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nearby hospitals'
      });
    }
  }
);

// GET /api/hospitals/:id - Get hospital profile
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid hospital ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const hospital = await Hospital.findById(id)
        .select('-password -qrSecret -verificationDocuments');

      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found'
        });
      }

      const hospitalObj = hospital.toObject();
      hospitalObj.isOpen = hospital.isOpen();
      hospitalObj.totalBloodStock = hospital.getTotalBloodStock();

      res.json({
        success: true,
        data: hospitalObj
      });

    } catch (error) {
      console.error('Error fetching hospital profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospital profile'
      });
    }
  }
);

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;