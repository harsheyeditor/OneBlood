import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import BloodRequest from '../models/BloodRequest.js';
import Hospital from '../models/Hospital.js';
import Donor from '../models/Donor.js';
import { aiMatcher } from '../services/aiMatcher.js';

const router = express.Router();

// Rate limiting for blood requests
const bloodRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per phone number
  keyGenerator: (req) => req.body.requesterPhone || req.ip,
  message: {
    success: false,
    error: 'Too many blood requests. Please wait before making another request.'
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

// POST /api/requests/create - Create new blood request
router.post('/create',
  bloodRequestLimiter,
  [
    body('requesterPhone')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format'),
    body('requesterName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('location.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('location.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('bloodType')
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
      .withMessage('Invalid blood type'),
    body('urgency')
      .optional()
      .isIn(['critical', 'urgent', 'normal'])
      .withMessage('Invalid urgency level'),
    body('patientCondition')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Patient condition must be less than 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { requesterPhone, requesterName, location, bloodType, urgency, patientCondition } = req.body;

      // Check for existing active request from the same phone number
      const existingRequest = await BloodRequest.findOne({
        requesterPhone,
        status: { $in: ['pending', 'accepted'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          error: 'You already have an active blood request. Please wait or contact the hospital.'
        });
      }

      // Create new blood request
      const bloodRequest = new BloodRequest({
        requesterPhone,
        requesterName,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        bloodType,
        urgency: urgency || 'normal',
        patientCondition
      });

      await bloodRequest.save();

      // Find and match nearby donors using AI
      const matchedDonors = await aiMatcher.findMatchingDonors(bloodRequest);

      // Update request with matched donors
      bloodRequest.matchedDonors = matchedDonors.map(donor => ({
        donorId: donor._id,
        matchScore: donor.matchScore,
        contactedAt: new Date(),
        response: 'pending'
      }));

      await bloodRequest.save();

      // Find nearby hospitals for notification
      const nearbyHospitals = await Hospital.findNearby(
        location.lat,
        location.lng,
        50, // 50km radius
        true // verified only
      );

      // Send real-time notifications (handled by Socket.io service)
      // This would be handled by the client emitting the request event

      res.status(201).json({
        success: true,
        data: {
          requestId: bloodRequest._id,
          status: bloodRequest.status,
          urgency: bloodRequest.urgency,
          expiresAt: bloodRequest.expiresAt,
          matchedDonors: matchedDonors.length,
          nearbyHospitals: nearbyHospitals.length,
          estimatedResponseTime: '15-30 minutes'
        },
        message: 'Blood request created successfully. Nearby hospitals and donors will be notified.'
      });

    } catch (error) {
      console.error('Error creating blood request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create blood request. Please try again.'
      });
    }
  }
);

// GET /api/requests/nearby - Get nearby blood requests
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
      .withMessage('Radius must be between 1 and 200 km'),
    query('bloodType')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])
      .withMessage('Invalid blood type'),
    query('status')
      .optional()
      .isIn(['pending', 'accepted', 'completed', 'cancelled'])
      .withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { lat, lng, radius = 50, bloodType, status } = req.query;

      // Build query
      const query = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: parseFloat(radius) * 1000 // Convert to meters
          }
        },
        expiresAt: { $gt: new Date() } // Only non-expired requests
      };

      if (bloodType) {
        query.bloodType = bloodType;
      }

      if (status) {
        query.status = status;
      } else {
        query.status = { $in: ['pending', 'accepted'] };
      }

      const requests = await BloodRequest.find(query)
        .populate('hospitalId', 'name address phone')
        .sort({ urgency: -1, createdAt: -1 })
        .limit(50);

      // Calculate distance for each request
      const requestsWithDistance = requests.map(request => {
        const requestObj = request.toObject();
        const distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          request.location.coordinates[1], request.location.coordinates[0]
        );
        requestObj.distance = Math.round(distance * 10) / 10; // Round to 1 decimal place
        requestObj.timeRemaining = request.timeRemaining;
        return requestObj;
      });

      res.json({
        success: true,
        data: {
          requests: requestsWithDistance,
          total: requestsWithDistance.length,
          searchArea: {
            center: { lat: parseFloat(lat), lng: parseFloat(lng) },
            radius: parseFloat(radius)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching nearby requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nearby requests'
      });
    }
  }
);

// POST /api/requests/:id/accept - Accept a blood request (hospital only)
router.post('/:id/accept',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid request ID'),
    body('hospitalId')
      .isMongoId()
      .withMessage('Invalid hospital ID'),
    body('estimatedTime')
      .optional()
      .isInt({ min: 5, max: 120 })
      .withMessage('Estimated time must be between 5 and 120 minutes')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { hospitalId, estimatedTime } = req.body;

      // Find the blood request
      const request = await BloodRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Blood request not found'
        });
      }

      // Check if request is still active
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request is no longer available for acceptance'
        });
      }

      // Check if not expired
      if (request.isExpired()) {
        return res.status(400).json({
          success: false,
          error: 'Request has expired'
        });
      }

      // Verify hospital
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital || !hospital.verified) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found or not verified'
        });
      }

      // Check if hospital already accepted
      if (request.acceptedHospitals.includes(hospitalId)) {
        return res.status(400).json({
          success: false,
          error: 'Hospital has already accepted this request'
        });
      }

      // Update request
      request.acceptedHospitals.push(hospitalId);
      request.hospitalId = hospitalId;
      request.status = 'accepted';
      await request.save();

      // Update hospital statistics
      hospital.updateStatistics(estimatedTime || 15, true);
      await hospital.save();

      // Get matched donors for notification
      const matchedDonors = await Donor.find({
        '_id': { $in: request.matchedDonors.map(d => d.donorId) }
      }).select('name phone bloodType');

      res.json({
        success: true,
        data: {
          requestId: request._id,
          status: request.status,
          hospital: {
            id: hospital._id,
            name: hospital.name,
            address: hospital.address,
            phone: hospital.phone
          },
          matchedDonors: matchedDonors.length,
          estimatedTime: estimatedTime || '15 minutes'
        },
        message: 'Blood request accepted successfully'
      });

    } catch (error) {
      console.error('Error accepting blood request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to accept blood request'
      });
    }
  }
);

// GET /api/requests/:id - Get specific blood request details
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid request ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const request = await BloodRequest.findById(id)
        .populate('hospitalId', 'name address phone location')
        .populate('matchedDonors.donorId', 'name bloodType totalDonations');

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Blood request not found'
        });
      }

      const requestObj = request.toObject();
      requestObj.timeRemaining = request.timeRemaining;
      requestObj.isExpired = request.isExpired();

      res.json({
        success: true,
        data: requestObj
      });

    } catch (error) {
      console.error('Error fetching blood request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blood request'
      });
    }
  }
);

// PUT /api/requests/:id/status - Update request status
router.put('/:id/status',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid request ID'),
    body('status')
      .isIn(['pending', 'accepted', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const request = await BloodRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Blood request not found'
        });
      }

      // Update status
      request.status = status;
      if (notes) {
        request.notes = notes;
      }

      await request.save();

      res.json({
        success: true,
        data: {
          requestId: request._id,
          status: request.status,
          updatedAt: request.updatedAt
        },
        message: 'Request status updated successfully'
      });

    } catch (error) {
      console.error('Error updating request status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update request status'
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