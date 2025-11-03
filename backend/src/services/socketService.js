import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import BloodRequest from '../models/BloodRequest.js';
import Hospital from '../models/Hospital.js';
import Donor from '../models/Donor.js';

const connectedHospitals = new Map(); // hospitalId -> socketId
const connectedDonors = new Map(); // donorId -> socketId
const hospitalRooms = new Map(); // hospitalId -> Set of socketIds

export const initializeSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      if (decoded.type === 'hospital') {
        const hospital = await Hospital.findById(decoded.id);
        if (!hospital || !hospital.verified) {
          return next(new Error('Invalid or unverified hospital'));
        }
        socket.hospitalId = hospital._id.toString();
        socket.hospitalData = hospital;
      } else if (decoded.type === 'donor') {
        const donor = await Donor.findById(decoded.id);
        if (!donor) {
          return next(new Error('Invalid donor'));
        }
        socket.donorId = donor._id.toString();
        socket.donorData = donor;
      } else {
        return next(new Error('Invalid user type'));
      }

      socket.userType = decoded.type;
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userType})`);

    // Handle hospital joining dashboard
    if (socket.userType === 'hospital') {
      handleHospitalConnection(socket, io);
    }

    // Handle donor connection
    if (socket.userType === 'donor') {
      handleDonorConnection(socket, io);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      handleDisconnection(socket);
    });

    // Handle emergency blood request
    socket.on('emergency_request', async (data) => {
      await handleEmergencyRequest(socket, data, io);
    });

    // Handle hospital accepting request
    socket.on('accept_request', async (data) => {
      await handleAcceptRequest(socket, data, io);
    });

    // Handle donor response to request
    socket.on('donor_response', async (data) => {
      await handleDonorResponse(socket, data, io);
    });

    // Handle location updates
    socket.on('update_location', async (data) => {
      await handleLocationUpdate(socket, data, io);
    });

    // Handle availability updates
    socket.on('update_availability', async (data) => {
      await handleAvailabilityUpdate(socket, data, io);
    });
  });

  // Schedule periodic tasks
  schedulePeriodicTasks(io);
};

const handleHospitalConnection = (socket, io) => {
  const hospitalId = socket.hospitalId;

  // Store hospital connection
  connectedHospitals.set(hospitalId, socket.id);

  // Join hospital to its location-based room
  const locationCluster = getLocationCluster(socket.hospitalData.location.coordinates);
  socket.join(`hospital_cluster_${locationCluster}`);

  // Join hospital-specific room
  socket.join(`hospital_${hospitalId}`);

  console.log(`Hospital ${hospitalId} joined cluster ${locationCluster}`);

  // Send active requests to hospital
  sendActiveRequestsToHospital(socket);
};

const handleDonorConnection = (socket, io) => {
  const donorId = socket.donorId;

  // Store donor connection
  connectedDonors.set(donorId, socket.id);

  // Join donor to their location-based room
  const locationCluster = getLocationCluster(socket.donorData.location.coordinates);
  socket.join(`donor_cluster_${locationCluster}`);

  // Join donor-specific room
  socket.join(`donor_${donorId}`);

  console.log(`Donor ${donorId} joined cluster ${locationCluster}`);
};

const handleDisconnection = (socket) => {
  if (socket.userType === 'hospital') {
    connectedHospitals.delete(socket.hospitalId);
    console.log(`Hospital ${socket.hospitalId} disconnected`);
  } else if (socket.userType === 'donor') {
    connectedDonors.delete(socket.donorId);
    console.log(`Donor ${socket.donorId} disconnected`);
  }
};

const handleEmergencyRequest = async (socket, data, io) => {
  try {
    const { requesterPhone, requesterName, location, bloodType, urgency, patientCondition } = data;

    // Create blood request
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

    // Find nearby hospitals
    const nearbyHospitals = await Hospital.findNearby(
      location.lat,
      location.lng,
      50, // 50km radius
      true // verified only
    );

    // Broadcast to nearby hospitals
    const requestCluster = getLocationCluster([location.lng, location.lat]);

    io.to(`hospital_cluster_${requestCluster}`).emit('new_request', {
      requestId: bloodRequest._id,
      requesterPhone,
      requesterName,
      location,
      bloodType,
      urgency,
      patientCondition,
      createdAt: bloodRequest.createdAt,
      distance: 'calculating...',
      estimatedResponseTime: '15 minutes'
    });

    // Find matching donors
    const matchingDonors = await Donor.findNearbyEligible(
      location.lat,
      location.lng,
      bloodType,
      30 // 30km radius
    );

    // Notify matching donors
    matchingDonors.forEach(donor => {
      io.to(`donor_${donor._id}`).emit('blood_needed', {
        requestId: bloodRequest._id,
        location,
        bloodType,
        urgency,
        estimatedTime: '30 minutes'
      });
    });

    // Acknowledge request creation
    socket.emit('request_created', {
      requestId: bloodRequest._id,
      status: 'pending',
      message: 'Request sent to nearby hospitals and donors'
    });

    console.log(`Emergency request created: ${bloodRequest._id}`);
  } catch (error) {
    console.error('Error handling emergency request:', error);
    socket.emit('error', { message: 'Failed to create emergency request' });
  }
};

const handleAcceptRequest = async (socket, data, io) => {
  try {
    const { requestId } = data;
    const hospitalId = socket.hospitalId;

    // Update request
    const request = await BloodRequest.findById(requestId);
    if (!request) {
      return socket.emit('error', { message: 'Request not found' });
    }

    // Add hospital to accepted list
    if (!request.acceptedHospitals.includes(hospitalId)) {
      request.acceptedHospitals.push(hospitalId);
      request.hospitalId = hospitalId;
      request.status = 'accepted';
      await request.save();
    }

    // Update hospital statistics
    const hospital = await Hospital.findById(hospitalId);
    if (hospital) {
      hospital.updateStatistics(15, true); // 15 minutes response time
      await hospital.save();
    }

    // Notify requester (via SMS in real implementation)
    // For now, emit to the original requester if connected

    // Notify matched donors
    request.matchedDonors.forEach(matchedDonor => {
      io.to(`donor_${matchedDonor.donorId}`).emit('request_accepted', {
        requestId,
        hospitalName: hospital.name,
        hospitalLocation: hospital.location,
        estimatedTime: '20 minutes'
      });
    });

    // Acknowledge acceptance
    socket.emit('request_accepted_success', {
      requestId,
      message: 'Request accepted successfully'
    });

    console.log(`Request ${requestId} accepted by hospital ${hospitalId}`);
  } catch (error) {
    console.error('Error handling request acceptance:', error);
    socket.emit('error', { message: 'Failed to accept request' });
  }
};

const handleDonorResponse = async (socket, data, io) => {
  try {
    const { requestId, response } = data;
    const donorId = socket.donorId;

    const request = await BloodRequest.findById(requestId);
    if (!request) {
      return socket.emit('error', { message: 'Request not found' });
    }

    // Update or add donor response
    const existingMatch = request.matchedDonors.find(
      match => match.donorId.toString() === donorId
    );

    if (existingMatch) {
      existingMatch.response = response;
      existingMatch.contactedAt = new Date();
    } else {
      request.matchedDonors.push({
        donorId,
        matchScore: 0.8, // Calculate actual score
        contactedAt: new Date(),
        response
      });
    }

    await request.save();

    // Update donor response history
    const donor = await Donor.findById(donorId);
    if (donor) {
      donor.responseHistory.push({
        requestId,
        responded: response === 'accepted',
        responseTime: 5 // Calculate actual response time
      });
      await donor.save();
    }

    // Notify hospital if there's an accepting hospital
    if (request.hospitalId) {
      io.to(`hospital_${request.hospitalId}`).emit('donor_responded', {
        requestId,
        donorId,
        donorName: donor.name,
        bloodType: donor.bloodType,
        response,
        estimatedArrival: '25 minutes'
      });
    }

    // Acknowledge response
    socket.emit('response_recorded', {
      requestId,
      response,
      message: 'Your response has been recorded'
    });

    console.log(`Donor ${donorId} responded ${response} to request ${requestId}`);
  } catch (error) {
    console.error('Error handling donor response:', error);
    socket.emit('error', { message: 'Failed to record response' });
  }
};

const handleLocationUpdate = async (socket, data, io) => {
  try {
    const { location } = data;

    if (socket.userType === 'donor') {
      await Donor.findByIdAndUpdate(socket.donorId, {
        'location.coordinates': [location.lng, location.lat]
      });

      // Update donor's cluster room
      const newCluster = getLocationCluster([location.lng, location.lat]);
      socket.leaveAll();
      socket.join(`donor_cluster_${newCluster}`);
      socket.join(`donor_${socket.donorId}`);
    } else if (socket.userType === 'hospital') {
      await Hospital.findByIdAndUpdate(socket.hospitalId, {
        'location.coordinates': [location.lng, location.lat]
      });

      // Update hospital's cluster room
      const newCluster = getLocationCluster([location.lng, location.lat]);
      socket.leaveAll();
      socket.join(`hospital_cluster_${newCluster}`);
      socket.join(`hospital_${socket.hospitalId}`);
    }
  } catch (error) {
    console.error('Error updating location:', error);
  }
};

const handleAvailabilityUpdate = async (socket, data, io) => {
  try {
    const { available } = data;

    if (socket.userType === 'donor') {
      await Donor.findByIdAndUpdate(socket.donorId, { available });

      socket.emit('availability_updated', { available });
    }
  } catch (error) {
    console.error('Error updating availability:', error);
  }
};

const sendActiveRequestsToHospital = async (socket) => {
  try {
    const hospital = socket.hospitalData;
    const activeRequests = await BloodRequest.findNearby(
      hospital.location.coordinates[1],
      hospital.location.coordinates[0],
      hospital.serviceRadius
    );

    socket.emit('active_requests', activeRequests);
  } catch (error) {
    console.error('Error sending active requests:', error);
  }
};

const getLocationCluster = (coordinates) => {
  // Simple grid-based clustering (approximately 10km x 10km grid)
  const lat = Math.floor(coordinates[1] / 0.1);
  const lng = Math.floor(coordinates[0] / 0.1);
  return `${lat}_${lng}`;
};

const schedulePeriodicTasks = (io) => {
  // Clean up expired requests every 5 minutes
  setInterval(async () => {
    try {
      const expiredRequests = await BloodRequest.find({
        expiresAt: { $lt: new Date() },
        status: { $in: ['pending', 'accepted'] }
      });

      for (const request of expiredRequests) {
        request.status = 'cancelled';
        await request.save();

        // Notify relevant parties
        if (request.hospitalId) {
          io.to(`hospital_${request.hospitalId}`).emit('request_expired', {
            requestId: request._id
          });
        }

        request.matchedDonors.forEach(matchedDonor => {
          io.to(`donor_${matchedDonor.donorId}`).emit('request_expired', {
            requestId: request._id
          });
        });
      }

      if (expiredRequests.length > 0) {
        console.log(`Cleaned up ${expiredRequests.length} expired requests`);
      }
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

export { connectedHospitals, connectedDonors };