import Donor from '../models/Donor.js';
import BloodRequest from '../models/BloodRequest.js';
import geolib from 'geolib';

class AIMatcher {
  constructor() {
    this.matchingWeights = {
      distance: 0.4,      // 40% weight for distance
      bloodType: 0.3,     // 30% weight for blood type compatibility
      availability: 0.2,  // 20% weight for availability
      responseHistory: 0.1 // 10% weight for past response history
    };

    this.urgencyMultipliers = {
      critical: 1.3,  // 30% boost for critical requests
      urgent: 1.1,    // 10% boost for urgent requests
      normal: 1.0     // No boost for normal requests
    };

    // Blood type compatibility matrix
    this.bloodCompatibility = {
      'O+': ['O+', 'A+', 'B+', 'AB+'],
      'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      'A+': ['A+', 'AB+'],
      'A-': ['A+', 'A-', 'AB+', 'AB-'],
      'B+': ['B+', 'AB+'],
      'B-': ['B+', 'B-', 'AB+', 'AB-'],
      'AB+': ['AB+'],
      'AB-': ['AB+', 'AB-']
    };
  }

  /**
   * Find matching donors for a blood request using AI scoring
   */
  async findMatchingDonors(bloodRequest) {
    try {
      const { location, bloodType, urgency } = bloodRequest;

      // Search radius based on urgency
      const searchRadius = urgency === 'critical' ? 50 : urgency === 'urgent' ? 40 : 30;

      // Find nearby eligible donors
      const nearbyDonors = await Donor.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: location.coordinates
            },
            $maxDistance: searchRadius * 1000 // Convert to meters
          }
        },
        available: true,
        $or: [
          { lastDonation: null },
          { lastDonation: { $lte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } }
        ]
      });

      // Calculate match scores for each donor
      const scoredDonors = nearbyDonors.map(donor => {
        const score = this.calculateMatchScore(donor, bloodRequest);
        return {
          ...donor.toObject(),
          matchScore: score
        };
      });

      // Sort by match score (highest first)
      scoredDonors.sort((a, b) => b.matchScore - a.matchScore);

      // Return top donors (limit based on urgency)
      const maxDonors = urgency === 'critical' ? 10 : urgency === 'urgent' ? 8 : 6;
      return scoredDonors.slice(0, maxDonors);

    } catch (error) {
      console.error('Error finding matching donors:', error);
      return [];
    }
  }

  /**
   * Calculate match score between donor and blood request
   */
  calculateMatchScore(donor, bloodRequest) {
    const { location, bloodType, urgency } = bloodRequest;

    let totalScore = 0;

    // Distance Score (40% weight)
    const distance = this.calculateDistance(
      donor.location.coordinates,
      location.coordinates
    );
    const distanceScore = this.calculateDistanceScore(distance);
    totalScore += distanceScore * this.matchingWeights.distance;

    // Blood Type Compatibility Score (30% weight)
    const compatibilityScore = this.calculateBloodTypeScore(donor.bloodType, bloodType);
    totalScore += compatibilityScore * this.matchingWeights.bloodType;

    // Availability Score (20% weight)
    const availabilityScore = this.calculateAvailabilityScore(donor);
    totalScore += availabilityScore * this.matchingWeights.availability;

    // Response History Score (10% weight)
    const responseScore = this.calculateResponseScore(donor);
    totalScore += responseScore * this.matchingWeights.responseHistory;

    // Apply urgency multiplier
    const finalScore = totalScore * (this.urgencyMultipliers[urgency] || 1.0);

    // Ensure score is between 0 and 100
    return Math.min(100, Math.max(0, finalScore));
  }

  /**
   * Calculate distance score (closer is better)
   */
  calculateDistanceScore(distance) {
    // distance is in meters
    const distanceKm = distance / 1000;

    if (distanceKm <= 5) return 100;      // Within 5km = perfect score
    if (distanceKm <= 10) return 90;     // 5-10km = excellent
    if (distanceKm <= 20) return 70;     // 10-20km = good
    if (distanceKm <= 30) return 50;     // 20-30km = fair
    if (distanceKm <= 40) return 30;     // 30-40km = poor
    return 10;                           // 40km+ = very poor
  }

  /**
   * Calculate blood type compatibility score
   */
  calculateBloodTypeScore(donorBloodType, requestBloodType) {
    // Exact match gets 100 points
    if (donorBloodType === requestBloodType) return 100;

    // Compatible types get scores based on rarity
    const compatibleTypes = this.bloodCompatibility[donorBloodType] || [];

    if (compatibleTypes.includes(requestBloodType)) {
      // Universal donors get bonus points
      if (donorBloodType === 'O-') return 95;
      if (donorBloodType === 'O+') return 90;

      // Other compatible types get good scores
      return 85;
    }

    return 0; // Not compatible
  }

  /**
   * Calculate availability score based on donation history
   */
  calculateAvailabilityScore(donor) {
    let score = 50; // Base score

    // Bonus for never having donated (eager donors)
    if (!donor.lastDonation) {
      score += 30;
    } else {
      // Calculate days since last donation
      const daysSinceLastDonation = Math.floor(
        (new Date() - donor.lastDonation) / (1000 * 60 * 60 * 24)
      );

      // Bonus for longer time since last donation
      if (daysSinceLastDonation >= 90) score += 25;
      else if (daysSinceLastDonation >= 60) score += 20;
      else if (daysSinceLastDonation >= 56) score += 15;
      else if (daysSinceLastDonation >= 30) score += 10;
    }

    // Bonus for high donation count (reliable donors)
    if (donor.totalDonations >= 10) score += 15;
    else if (donor.totalDonations >= 5) score += 10;
    else if (donor.totalDonations >= 1) score += 5;

    return Math.min(100, score);
  }

  /**
   * Calculate response history score based on past behavior
   */
  calculateResponseScore(donor) {
    if (!donor.responseHistory || donor.responseHistory.length === 0) {
      return 50; // Neutral score for new donors
    }

    const recentResponses = donor.responseHistory.slice(-10); // Last 10 responses
    const totalResponses = recentResponses.length;
    const positiveResponses = recentResponses.filter(r => r.responded).length;

    const responseRate = positiveResponses / totalResponses;

    // Calculate average response time (faster is better)
    const avgResponseTime = recentResponses.reduce((sum, r) => {
      return sum + (r.responseTime || 30); // Default 30 minutes if not specified
    }, 0) / totalResponses;

    let score = responseRate * 70; // 70% of score based on response rate

    // Bonus for fast response times
    if (avgResponseTime <= 5) score += 30;    // Under 5 minutes
    else if (avgResponseTime <= 10) score += 25; // 5-10 minutes
    else if (avgResponseTime <= 15) score += 20; // 10-15 minutes
    else if (avgResponseTime <= 20) score += 15; // 15-20 minutes
    else if (avgResponseTime <= 30) score += 10; // 20-30 minutes

    return Math.min(100, score);
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(coords1, coords2) {
    return geolib.getDistance(
      { latitude: coords1[1], longitude: coords1[0] },
      { latitude: coords2[1], longitude: coords2[0] }
    );
  }

  /**
   * Predict blood demand for a hospital based on historical data
   */
  async predictBloodDemand(hospitalId, timeHorizon = 7) {
    try {
      // Get completed requests for this hospital from the last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const completedRequests = await BloodRequest.find({
        hospitalId,
        status: 'completed',
        updatedAt: { $gte: ninetyDaysAgo }
      });

      // Group by blood type and analyze patterns
      const demandByType = {};
      const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

      bloodTypes.forEach(type => {
        const typeRequests = completedRequests.filter(req => req.bloodType === type);

        // Calculate daily average with seasonal adjustments
        const dailyAverage = typeRequests.length / 90;

        // Apply time horizon
        const predictedDemand = dailyAverage * timeHorizon;

        // Add seasonal factor (simple implementation)
        const seasonalFactor = this.getSeasonalFactor(new Date());
        const adjustedDemand = predictedDemand * seasonalFactor;

        demandByType[type] = {
          dailyAverage: Math.round(dailyAverage * 10) / 10,
          predictedDemand: Math.round(adjustedDemand),
          confidence: this.calculateConfidence(typeRequests.length)
        };
      });

      return {
        hospitalId,
        timeHorizon,
        demandByType,
        totalPredictedDemand: Object.values(demandByType).reduce((sum, d) => sum + d.predictedDemand, 0),
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error predicting blood demand:', error);
      return null;
    }
  }

  /**
   * Get seasonal factor for blood demand
   */
  getSeasonalFactor(date) {
    const month = date.getMonth();

    // Higher demand during festival/wedding seasons (simplified model)
    // These are approximate patterns for India
    const seasonalFactors = {
      0: 1.1,  // January - New Year, winter illnesses
      1: 1.0,  // February
      2: 1.2,  // March - Holi, spring festivals
      3: 1.0,  // April
      4: 0.9,  // May
      5: 0.8,  // June
      6: 0.9,  // July
      7: 1.0,  // August
      8: 1.1,  // September
      9: 1.3,  // October - Navratri, Dussehra
      10: 1.4, // November - Diwali, wedding season
      11: 1.3  // December - Christmas, year-end
    };

    return seasonalFactors[month] || 1.0;
  }

  /**
   * Calculate confidence level based on data sample size
   */
  calculateConfidence(sampleSize) {
    if (sampleSize < 5) return 'low';
    if (sampleSize < 20) return 'medium';
    if (sampleSize < 50) return 'high';
    return 'very_high';
  }

  /**
   * Optimize donor assignment for multiple simultaneous requests
   */
  async optimizeDonorAssignment(requests) {
    try {
      // Get all matching donors for all requests
      const allMatches = [];

      for (const request of requests) {
        const matches = await this.findMatchingDonors(request);
        allMatches.push({
          requestId: request._id,
          priority: request.urgency === 'critical' ? 3 : request.urgency === 'urgent' ? 2 : 1,
          matches: matches
        });
      }

      // Sort requests by priority
      allMatches.sort((a, b) => b.priority - a.priority);

      const assignments = new Map(); // donorId -> requestId
      const assignedRequests = new Set();

      // Greedy assignment based on priority and match scores
      for (const requestMatch of allMatches) {
        if (assignedRequests.has(requestMatch.requestId.toString())) continue;

        // Find best available donor
        for (const donor of requestMatch.matches) {
          const donorId = donor._id.toString();

          if (!assignments.has(donorId)) {
            assignments.set(donorId, requestMatch.requestId);
            assignedRequests.add(requestMatch.requestId.toString());
            break;
          }
        }
      }

      // Convert assignments to the expected format
      const results = [];
      assignments.forEach((requestId, donorId) => {
        results.push({
          donorId,
          requestId,
          status: 'assigned'
        });
      });

      return results;

    } catch (error) {
      console.error('Error optimizing donor assignment:', error);
      return [];
    }
  }

  /**
   * Get donor availability predictions
   */
  async predictDonorAvailability(location, timeHorizon = 24) {
    try {
      // Find donors in the area
      const nearbyDonors = await Donor.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: location.coordinates
            },
            $maxDistance: 30000 // 30km radius
          }
        },
        available: true
      });

      // Predict availability based on historical patterns
      const predictions = nearbyDonors.map(donor => {
        const baseAvailability = donor.available ? 0.8 : 0.2;

        // Adjust based on time of day
        const hour = new Date().getHours();
        let timeFactor = 1.0;

        if (hour >= 9 && hour <= 17) timeFactor = 1.2;  // Business hours
        else if (hour >= 18 && hour <= 21) timeFactor = 1.1; // Evening
        else if (hour >= 22 || hour <= 6) timeFactor = 0.7;   // Night

        // Adjust based on donation history
        let donationFactor = 1.0;
        if (donor.lastDonation) {
          const daysSinceLastDonation = Math.floor(
            (new Date() - donor.lastDonation) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastDonation >= 56) donationFactor = 1.0;
          else donationFactor = 0.5;
        }

        const predictedAvailability = baseAvailability * timeFactor * donationFactor;

        return {
          donorId: donor._id,
          bloodType: donor.bloodType,
          predictedAvailability: Math.min(1.0, predictedAvailability),
          factors: {
            base: baseAvailability,
            time: timeFactor,
            donation: donationFactor
          }
        };
      });

      return {
        location,
        timeHorizon,
        predictions,
        totalDonors: predictions.length,
        averageAvailability: predictions.reduce((sum, p) => sum + p.predictedAvailability, 0) / predictions.length
      };

    } catch (error) {
      console.error('Error predicting donor availability:', error);
      return null;
    }
  }
}

export const aiMatcher = new AIMatcher();
export default AIMatcher;