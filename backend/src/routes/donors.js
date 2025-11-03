import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import Donor from '../models/Donor.js';
import BloodRequest from '../models/BloodRequest.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Rate limiting for donor registration
const donorRegistrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1, // 1 registration per phone per day
  keyGenerator: (req) => req.body.phone || req.ip,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again tomorrow.'
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
const generateToken = (donorId, type = 'donor') => {
  return jwt.sign(
    { id: donorId, type },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// POST /api/donors/register - Register new donor
router.post('/register',
  donorRegistrationLimiter,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    body('bloodType')
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
      .withMessage('Invalid blood type'),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Invalid date of birth format'),
    body('address')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Address must be between 10 and 500 characters'),
    body('location.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('location.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, phone, email, bloodType, dateOfBirth, address, location } = req.body;

      // Check if donor already exists
      const existingDonor = await Donor.findOne({ phone });
      if (existingDonor) {
        return res.status(400).json({
          success: false,
          error: 'A donor with this phone number is already registered'
        });
      }

      // Generate unique donor ID and QR secret
      const donorId = Donor.generateDonorId();
      const qrSecret = crypto.randomBytes(32).toString('hex');

      // Create new donor
      const donor = new Donor({
        donorId,
        name,
        phone,
        email,
        bloodType,
        dateOfBirth: new Date(dateOfBirth),
        address,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        qrSecret
      });

      await donor.save();

      // Generate QR code
      const qrData = {
        donorId,
        bloodType,
        phone,
        timestamp: new Date().toISOString(),
        secret: qrSecret
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Generate JWT token
      const token = generateToken(donor._id);

      // Award first donation achievement (registered)
      donor.achievements.push('first_donation');
      donor.points += 10;
      await donor.save();

      res.status(201).json({
        success: true,
        data: {
          donor: {
            id: donor._id,
            donorId: donor.donorId,
            name: donor.name,
            bloodType: donor.bloodType,
            phone: donor.phone,
            available: donor.available,
            achievements: donor.achievements,
            points: donor.points,
            createdAt: donor.createdAt
          },
          qrCode: qrCodeDataURL,
          token
        },
        message: 'Donor registration successful! Your QR code has been generated.'
      });

    } catch (error) {
      console.error('Error registering donor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register donor. Please try again.'
      });
    }
  }
);

// GET /api/donors/:id/qr - Get donor QR code
router.get('/:id/qr',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid donor ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const donor = await Donor.findById(id);
      if (!donor) {
        return res.status(404).json({
          success: false,
          error: 'Donor not found'
        });
      }

      // Generate QR code with current data
      const qrData = {
        donorId: donor.donorId,
        bloodType: donor.bloodType,
        phone: donor.phone,
        timestamp: new Date().toISOString(),
        secret: donor.qrSecret,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({
        success: true,
        data: {
          qrCode: qrCodeDataURL,
          donorId: donor.donorId,
          bloodType: donor.bloodType,
          available: donor.available,
          lastDonation: donor.lastDonation,
          eligibleToDonate: donor.isEligibleToDonate()
        }
      });

    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code'
      });
    }
  }
);

// GET /api/donors/nearby - Get nearby eligible donors
router.get('/nearby',
  [
    query('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    query('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    query('bloodType')
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
      .withMessage('Invalid blood type'),
    query('radius')
      .optional()
      .isFloat({ min: 1, max: 100 })
      .withMessage('Radius must be between 1 and 100 km')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { lat, lng, bloodType, radius = 30 } = req.query;

      // Find nearby eligible donors
      const donors = await Donor.findNearbyEligible(
        parseFloat(lat),
        parseFloat(lng),
        bloodType,
        parseFloat(radius)
      ).select('-qrSecret -responseHistory');

      // Calculate distance and match score for each donor
      const donorsWithScore = donors.map(donor => {
        const donorObj = donor.toObject();
        const distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          donor.location.coordinates[1], donor.location.coordinates[0]
        );

        donorObj.distance = Math.round(distance * 10) / 10;
        donorObj.matchScore = donor.calculateMatchScore(
          { coordinates: [parseFloat(lng), parseFloat(lat)] },
          'normal' // Can be parameterized
        );

        // Remove sensitive information
        delete donorObj.email;
        delete donorObj.address;

        return donorObj;
      });

      // Sort by match score
      donorsWithScore.sort((a, b) => b.matchScore - a.matchScore);

      res.json({
        success: true,
        data: {
          donors: donorsWithScore,
          total: donorsWithScore.length,
          searchArea: {
            center: { lat: parseFloat(lat), lng: parseFloat(lng) },
            radius: parseFloat(radius),
            bloodType
          }
        }
      });

    } catch (error) {
      console.error('Error fetching nearby donors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nearby donors'
      });
    }
  }
);

// GET /api/donors/:id - Get donor profile
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid donor ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const donor = await Donor.findById(id)
        .select('-qrSecret -responseHistory');

      if (!donor) {
        return res.status(404).json({
          success: false,
          error: 'Donor not found'
        });
      }

      const donorObj = donor.toObject();
      donorObj.eligibleToDonate = donor.isEligibleToDonate();
      donorObj.daysUntilNextDonation = donor.lastDonation ?
        Math.max(0, 56 - Math.floor((new Date() - donor.lastDonation) / (1000 * 60 * 60 * 24))) : 0;

      res.json({
        success: true,
        data: donorObj
      });

    } catch (error) {
      console.error('Error fetching donor profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch donor profile'
      });
    }
  }
);

// PUT /api/donors/:id/availability - Update donor availability
router.put('/:id/availability',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid donor ID'),
    body('available')
      .isBoolean()
      .withMessage('Available must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { available } = req.body;

      const donor = await Donor.findByIdAndUpdate(
        id,
        { available },
        { new: true }
      ).select('-qrSecret -responseHistory');

      if (!donor) {
        return res.status(404).json({
          success: false,
          error: 'Donor not found'
        });
      }

      res.json({
        success: true,
        data: {
          donorId: donor.donorId,
          available: donor.available
        },
        message: 'Availability updated successfully'
      });

    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update availability'
      });
    }
  }
);

// PUT /api/donors/:id/health - Update donor health metrics
router.put('/:id/health',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid donor ID'),
    body('bloodPressure')
      .optional()
      .matches(/^\d{2,3}\/\d{2,3}$/)
      .withMessage('Blood pressure must be in format 120/80'),
    body('ironLevel')
      .optional()
      .isFloat({ min: 8, max: 20 })
      .withMessage('Iron level must be between 8-20 g/dL'),
    body('pulse')
      .optional()
      .isInt({ min: 60, max: 100 })
      .withMessage('Pulse must be between 60-100 bpm')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { bloodPressure, ironLevel, pulse } = req.body;

      const donor = await Donor.findById(id);
      if (!donor) {
        return res.status(404).json({
          success: false,
          error: 'Donor not found'
        });
      }

      // Update health metrics
      if (bloodPressure) donor.healthMetrics.bloodPressure = bloodPressure;
      if (ironLevel !== undefined) donor.healthMetrics.ironLevel = ironLevel;
      if (pulse !== undefined) donor.healthMetrics.pulse = pulse;
      donor.healthMetrics.lastUpdated = new Date();

      await donor.save();

      res.json({
        success: true,
        data: {
          healthMetrics: donor.healthMetrics
        },
        message: 'Health metrics updated successfully'
      });

    } catch (error) {
      console.error('Error updating health metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update health metrics'
      });
    }
  }
);

// GET /api/donors/leaderboard - Get donor leaderboard
router.get('/leaderboard',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('bloodType')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
      .withMessage('Invalid blood type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { limit = 50, bloodType } = req.query;

      const query = {};
      if (bloodType) {
        query.bloodType = bloodType;
      }

      const leaderboard = await Donor.find(query)
        .select('donorId name bloodType totalDonations points achievements createdAt')
        .sort({ points: -1, totalDonations: -1 })
        .limit(parseInt(limit));

      // Add rank
      const leaderboardWithRank = leaderboard.map((donor, index) => ({
        ...donor.toObject(),
        rank: index + 1
      }));

      res.json({
        success: true,
        data: {
          leaderboard: leaderboardWithRank,
          total: leaderboardWithRank.length,
          filters: { limit: parseInt(limit), bloodType }
        }
      });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard'
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