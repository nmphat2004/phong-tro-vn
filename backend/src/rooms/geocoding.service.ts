import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  private geocodeCache = new Map<string, { lat: number; lng: number } | null>();

  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    const cleanAddress = address.trim().toLowerCase();
    if (this.geocodeCache.has(cleanAddress)) {
      return this.geocodeCache.get(cleanAddress) ?? null;
    }

    try {
      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'RoomMatchingApp/1.0',
        },
      });

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        const result = {
          lat: parseFloat(lat),
          lng: parseFloat(lon),
        };
        this.geocodeCache.set(cleanAddress, result);
        return result;
      }

      const fallback = this.getFallbackCoords(address);
      this.geocodeCache.set(cleanAddress, fallback);
      return fallback;
    } catch (error) {
      console.error('Geocoding Error:', error.message);
      return this.getFallbackCoords(address);
    }
  }

  private getFallbackCoords(address: string): { lat: number; lng: number } | null {
    const addr = address.toLowerCase();
    if (
      addr.includes('hồ chí minh') ||
      addr.includes('ho chi minh') ||
      addr.includes('sài gòn') ||
      addr.includes('sai gon') ||
      addr.includes('hcm')
    ) {
      return { lat: 10.8231, lng: 106.6297 };
    }
    if (
      addr.includes('hà nội') ||
      addr.includes('ha noi') ||
      addr.includes('hn')
    ) {
      return { lat: 21.0285, lng: 105.8542 };
    }
    if (
      addr.includes('đà nẵng') ||
      addr.includes('da nang') ||
      addr.includes('dn')
    ) {
      return { lat: 16.0544, lng: 108.2022 };
    }
    if (addr.includes('cần thơ') || addr.includes('can tho')) {
      return { lat: 10.0452, lng: 105.7469 };
    }
    if (addr.includes('hải phòng') || addr.includes('hai phong')) {
      return { lat: 20.8449, lng: 106.6881 };
    }
    return { lat: 14.0583, lng: 108.2772 };
  }
}
