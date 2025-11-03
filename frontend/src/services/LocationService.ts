interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface LocationServiceReturn {
  getCurrentLocation: () => Promise<Location>;
  watchLocation: (callback: (location: Location) => void) => number;
  clearWatch: (watchId: number) => void;
  isSupported: boolean;
}

export class LocationService {
  private static isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  private static getLocationPromise(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied by user'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out'));
              break;
            default:
              reject(new Error('An unknown error occurred while retrieving location'));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1 minute cache
        }
      );
    });
  }

  static async getCurrentLocation(): Promise<Location> {
    try {
      const location = await this.getLocationPromise();
      return location;
    } catch (error) {
      // Fallback to IP-based location estimation
      console.warn('GPS location failed, trying IP-based location:', error);
      return this.getIPLocation();
    }
  }

  private static async getIPLocation(): Promise<Location> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.latitude && data.longitude) {
        return {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          accuracy: 1000 // Lower accuracy for IP-based location
        };
      } else {
        throw new Error('Could not determine location from IP');
      }
    } catch (error) {
      // Default to major Indian cities as fallback
      console.warn('IP-based location failed, using default location:', error);
      return {
        lat: 28.6139, // New Delhi
        lng: 77.2090,
        accuracy: 5000
      };
    }
  }

  static watchLocation(callback: (location: Location) => void): number {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }

  static clearWatch(watchId: number): void {
    if (this.isSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  static calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lng - loc1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) *
      Math.cos(this.toRadians(loc2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static isWithinRadius(center: Location, point: Location, radiusKm: number): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusKm;
  }

  static async getAddressFromLocation(location: Location): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=en`
      );
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      }
    } catch (error) {
      console.warn('Failed to get address from location:', error);
      return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    }
  }

  static async getLocationFromAddress(address: string): Promise<Location | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          accuracy: 100
        };
      } else {
        return null;
      }
    } catch (error) {
      console.warn('Failed to get location from address:', error);
      return null;
    }
  }
}

export default LocationService;