interface BloodRequestData {
  requesterName: string;
  requesterPhone: string;
  bloodType: string;
  urgency: string;
  patientCondition?: string;
  location: { lat: number; lng: number };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface BloodRequest {
  id: string;
  requesterName: string;
  requesterPhone: string;
  bloodType: string;
  urgency: string;
  patientCondition?: string;
  location: { lat: number; lng: number };
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  matchedDonors: number;
  nearbyHospitals: number;
  estimatedResponseTime: string;
}

export class BloodRequestService {
  private static baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  static async createRequest(requestData: BloodRequestData): Promise<ApiResponse<{ requestId: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create blood request');
      }

      return data;
    } catch (error) {
      console.error('Error creating blood request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async getNearbyRequests(
    lat: number,
    lng: number,
    radius: number = 50,
    bloodType?: string
  ): Promise<ApiResponse<{ requests: BloodRequest[]; total: number }>> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
      });

      if (bloodType) {
        params.append('bloodType', bloodType);
      }

      const response = await fetch(`${this.baseUrl}/requests/nearby?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch nearby requests');
      }

      return data;
    } catch (error) {
      console.error('Error fetching nearby requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async getRequestDetails(requestId: string): Promise<ApiResponse<BloodRequest>> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch request details');
      }

      return data;
    } catch (error) {
      console.error('Error fetching request details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async acceptRequest(
    requestId: string,
    hospitalId: string,
    estimatedTime?: number
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalId,
          estimatedTime
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept request');
      }

      return data;
    } catch (error) {
      console.error('Error accepting request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async updateRequestStatus(
    requestId: string,
    status: 'pending' | 'accepted' | 'completed' | 'cancelled',
    notes?: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update request status');
      }

      return data;
    } catch (error) {
      console.error('Error updating request status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Utility methods
  static getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return '#d32f2f';
      case 'urgent':
        return '#f57c00';
      case 'normal':
        return '#388e3c';
      default:
        return '#757575';
    }
  }

  static getUrgencyLabel(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'Critical';
      case 'urgent':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      default:
        return 'Unknown';
    }
  }

  static formatTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  static formatRequestDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  static formatPhoneNumber(phone: string): string {
    // Simple formatting for Indian numbers
    if (phone.startsWith('+91')) {
      const clean = phone.replace('+91', '').replace(/\D/g, '');
      if (clean.length === 10) {
        return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
      }
    }
    return phone;
  }
}

export default BloodRequestService;