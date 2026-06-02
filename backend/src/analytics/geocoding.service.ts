import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  private extractCoordsFromText(
    text: string,
  ): { lat: number; lng: number } | null {
    // Thử nhiều pattern khác nhau để tìm tọa độ
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /place\/(-?\d+\.\d+),(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /destination=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        // Validate tọa độ hợp lệ (Việt Nam: lat 8-24, lng 102-110)
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }
    return null;
  }

  async resolveGoogleMapsUrl(
    url: string,
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      // Bước 1: Thử trích xuất tọa độ trực tiếp từ URL
      const directResult = this.extractCoordsFromText(url);
      if (directResult) return directResult;

      // Bước 2: Nếu là link rút gọn, follow redirect để lấy URL đầy đủ
      const response = await axios.get(url, {
        maxRedirects: 10,
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        validateStatus: (status) => status < 400,
      });

      // Thử lấy URL cuối cùng sau redirect
      const finalUrl =
        response.request?.res?.responseUrl ||
        response.request?.responseURL ||
        response.request?._redirectable?._currentUrl ||
        url;

      const redirectResult = this.extractCoordsFromText(finalUrl);
      if (redirectResult) return redirectResult;

      // Bước 3: Nếu vẫn không tìm được, tìm trong body HTML
      if (typeof response.data === 'string') {
        const bodyResult = this.extractCoordsFromText(response.data);
        if (bodyResult) return bodyResult;
      }

      return null;
    } catch (error) {
      console.error('Error resolving Google Maps URL:', error.message);
      return null;
    }
  }

  private geocodeCache = new Map<string, { lat: number; lng: number } | null>();

  /**
   * Geocode plain text address using OpenStreetMap Nominatim API
   */
  async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const cleanAddress = address.trim().toLowerCase();
    if (this.geocodeCache.has(cleanAddress)) {
      return this.geocodeCache.get(cleanAddress) ?? null;
    }

    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: address,
            format: 'json',
            limit: 1,
            countrycodes: 'vn',
          },
          headers: {
            'User-Agent': 'RoomMatchingApp/1.0',
          },
          timeout: 8000,
        },
      );

      if (response.data && response.data.length > 0) {
        const result = {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon),
        };
        this.geocodeCache.set(cleanAddress, result);
        return result;
      }

      const fallback = this.getFallbackCoords(address);
      this.geocodeCache.set(cleanAddress, fallback);
      return fallback;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      // Khi gặp lỗi 503 hoặc kết nối thất bại, sử dụng tọa độ dự phòng theo khu vực
      return this.getFallbackCoords(address);
    }
  }

  private getFallbackCoords(
    address: string,
  ): { lat: number; lng: number } | null {
    const addr = address.toLowerCase();
    if (
      addr.includes('hồ chí minh') ||
      addr.includes('ho chi minh') ||
      addr.includes('sài gòn') ||
      addr.includes('sai gon') ||
      addr.includes('hcm')
    ) {
      return { lat: 10.8231, lng: 106.6297 }; // TP.HCM
    }
    if (
      addr.includes('hà nội') ||
      addr.includes('ha noi') ||
      addr.includes('hn')
    ) {
      return { lat: 21.0285, lng: 105.8542 }; // Hà Nội
    }
    if (
      addr.includes('đà nẵng') ||
      addr.includes('da nang') ||
      addr.includes('dn')
    ) {
      return { lat: 16.0544, lng: 108.2022 }; // Đà Nẵng
    }
    if (addr.includes('cần thơ') || addr.includes('can tho')) {
      return { lat: 10.0452, lng: 105.7469 }; // Cần Thơ
    }
    if (addr.includes('hải phòng') || addr.includes('hai phong')) {
      return { lat: 20.8449, lng: 106.6881 }; // Hải Phòng
    }
    // Mặc định trả về tọa độ trung tâm Việt Nam nếu không khớp thành phố nào
    return { lat: 14.0583, lng: 108.2772 };
  }
}
