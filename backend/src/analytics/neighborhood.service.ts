import { Injectable } from '@nestjs/common';

// Trọng số + bán kính tối ưu cho từng loại POI
const POI_CONFIG: Record<string, { weight: number; radius: number }> = {
  school: { weight: 1.5, radius: 500 },
  hospital: { weight: 1.3, radius: 1000 },
  supermarket: { weight: 1.2, radius: 500 },
  restaurant: { weight: 1.0, radius: 300 },
  bank: { weight: 1.0, radius: 500 },
  bus_station: { weight: 1.4, radius: 300 },
  market: { weight: 1.1, radius: 500 },
  park: { weight: 0.7, radius: 500 },
};

@Injectable()
export class NeighborhoodService {
  async analyze(lat: number, lng: number) {
    // Lấy POI từ Overpass API (OpenStreetMap — miễn phí)
    const pois = await this.fetchPOIs(lat, lng, 1000);

    // Tính điểm từng tiêu chí
    const convenienceScore = this.calcScore(pois, [
      'supermarket',
      'restaurant',
      'market',
      'bank',
    ]);
    const transportScore = this.calcTransport(pois);
    const safetyScore = this.calcSafety(pois);
    const noiseScore = this.calcNoise(pois);

    // Tổng điểm có trọng số
    const overall = Math.round(
      convenienceScore * 0.35 +
        transportScore * 0.3 +
        safetyScore * 0.25 +
        noiseScore * 0.1,
    );

    const grade =
      overall >= 80 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : 'D';

    return {
      overall,
      grade,
      scores: { convenienceScore, transportScore, safetyScore, noiseScore },
      nearbyPlaces: pois.slice(0, 15),
      summary: this.buildSummary(overall, {
        convenienceScore,
        transportScore,
        safetyScore,
        noiseScore,
      }),
    };
  }

  // ── Haversine Formula ─────────────────────────────────────────
  // Tính khoảng cách chính xác giữa 2 tọa độ GPS (đơn vị: mét)
  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6_371_000; // bán kính Trái Đất (mét)
    const toRad = (x: number) => (x * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Distance Decay Function ───────────────────────────────────
  // f(d) = e^(-λd) với λ = 1/r₀
  // POI càng gần → decay → 1 (điểm cao)
  // POI càng xa  → decay → 0 (không đóng góp)
  private distanceDecay(distance: number, optimalRadius: number): number {
    const lambda = 1 / optimalRadius;
    return Math.exp(-lambda * distance);
  }

  private calcScore(pois: any[], types: string[]): number {
    let score = 0,
      maxPossible = 0;

    types.forEach((type) => {
      const cfg = POI_CONFIG[type];
      if (!cfg) return;

      maxPossible += cfg.weight * 10;

      pois
        .filter((p) => p.type === type)
        .slice(0, 5)
        .forEach((poi) => {
          const decay = this.distanceDecay(poi.distance, cfg.radius);
          score += cfg.weight * decay * 10;
        });
    });

    return maxPossible > 0
      ? Math.min(100, Math.round((score / maxPossible) * 100))
      : 50;
  }

  private calcTransport(pois: any[]): number {
    const stops = pois.filter((p) => p.type === 'bus_station');
    if (stops.length === 0) return 30;
    const d = stops[0].distance;
    if (d < 200) return 100;
    if (d < 400) return 85;
    if (d < 600) return 70;
    if (d < 1000) return 55;
    return 35;
  }

  private calcSafety(pois: any[]): number {
    let score = 55;
    if (pois.some((p) => p.type === 'hospital' && p.distance < 1000))
      score += 15;
    if (pois.some((p) => p.type === 'school' && p.distance < 800)) score += 15;
    const restCount = pois.filter((p) => p.type === 'restaurant').length;
    if (restCount > 8) score += 10;
    else if (restCount > 4) score += 5;
    return Math.min(100, score);
  }

  private calcNoise(pois: any[]): number {
    let score = 80;
    const restCount = pois.filter((p) => p.type === 'restaurant').length;
    const hasMarket = pois.some((p) => p.type === 'market');
    if (restCount > 10) score -= 25;
    else if (restCount > 5) score -= 15;
    if (hasMarket) score -= 15;
    return Math.max(20, score);
  }

  // Gọi Overpass API (OpenStreetMap — hoàn toàn miễn phí)
  private async fetchPOIs(lat: number, lng: number, radius: number) {
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="school"](around:${radius},${lat},${lng});
        way["amenity"="school"](around:${radius},${lat},${lng});
        relation["amenity"="school"](around:${radius},${lat},${lng});

        node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        relation["amenity"="hospital"](around:${radius},${lat},${lng});

        node["amenity"="clinic"](around:${radius},${lat},${lng});
        way["amenity"="clinic"](around:${radius},${lat},${lng});
        relation["amenity"="clinic"](around:${radius},${lat},${lng});

        node["shop"="supermarket"](around:${radius},${lat},${lng});
        way["shop"="supermarket"](around:${radius},${lat},${lng});
        relation["shop"="supermarket"](around:${radius},${lat},${lng});

        node["amenity"="restaurant"](around:500,${lat},${lng});
        way["amenity"="restaurant"](around:500,${lat},${lng});
        relation["amenity"="restaurant"](around:500,${lat},${lng});

        node["amenity"="bank"](around:${radius},${lat},${lng});
        way["amenity"="bank"](around:${radius},${lat},${lng});
        relation["amenity"="bank"](around:${radius},${lat},${lng});

        node["highway"="bus_stop"](around:500,${lat},${lng});
        way["highway"="bus_stop"](around:500,${lat},${lng});
        relation["highway"="bus_stop"](around:500,${lat},${lng});

        node["amenity"="marketplace"](around:${radius},${lat},${lng});
        way["amenity"="marketplace"](around:${radius},${lat},${lng});
        relation["amenity"="marketplace"](around:${radius},${lat},${lng});

        node["leisure"="park"](around:${radius},${lat},${lng});
        way["leisure"="park"](around:${radius},${lat},${lng});
        relation["leisure"="park"](around:${radius},${lat},${lng});
      );
      out body center;
    `;

    try {
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];

      let data: any = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'text/plain' },
          });
          if (!res.ok) continue;
          data = await res.json();
          if (data?.elements?.length) break;
        } catch {
          continue;
        }
      }

      const overpassPois = (data?.elements || [])
        .map((el: any) => ({
          name:
            el.tags?.['name:vi'] || el.tags?.name || this.mapTypeName(el.tags),
          type: this.mapType(el.tags),
          distance: Math.round(
            this.haversine(
              lat,
              lng,
              el.lat ?? el.center?.lat,
              el.lon ?? el.center?.lon,
            ),
          ),
          lat: el.lat ?? el.center?.lat,
          lng: el.lon ?? el.center?.lon,
        }))
        .filter(
          (p: any) =>
            p.type !== 'other' &&
            Number.isFinite(p.distance) &&
            p.distance >= 0 &&
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lng),
        )
        .sort((a: any, b: any) => a.distance - b.distance);

      if (overpassPois.length > 0) {
        return overpassPois;
      }

      // Fallback when Overpass is rate-limited or returns empty.
      return this.fetchPOIsFromNominatim(lat, lng, radius);
    } catch (err) {
      console.error('Overpass API error:', err);
      return this.fetchPOIsFromNominatim(lat, lng, radius);
    }
  }

  private async fetchPOIsFromNominatim(
    lat: number,
    lng: number,
    radius: number,
  ) {
    const deltaLat = radius / 111_320;
    const deltaLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
    const left = lng - deltaLng;
    const right = lng + deltaLng;
    const top = lat + deltaLat;
    const bottom = lat - deltaLat;
    const viewbox = `${left},${top},${right},${bottom}`;

    const searchTerms: Record<string, string> = {
      school: 'school',
      hospital: 'hospital',
      supermarket: 'supermarket',
      restaurant: 'restaurant',
      bank: 'bank',
      bus_station: 'bus stop',
      market: 'market',
      park: 'park',
    };

    try {
      const responses = await Promise.all(
        Object.entries(searchTerms).map(async ([type, q]) => {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
              q,
            )}&bounded=1&limit=6&viewbox=${encodeURIComponent(viewbox)}`,
            {
              headers: {
                'User-Agent': 'RoomMatchingApp/1.0',
              },
            },
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (data || []).map((item: any) => ({
            name: item.name || item.display_name || this.mapTypeName({}),
            type,
            distance: Math.round(
              this.haversine(lat, lng, Number(item.lat), Number(item.lon)),
            ),
            lat: Number(item.lat),
            lng: Number(item.lon),
          }));
        }),
      );

      return responses
        .flat()
        .filter((p: any) => Number.isFinite(p.distance) && p.distance <= radius)
        .sort((a: any, b: any) => a.distance - b.distance);
    } catch (err) {
      console.error('Nominatim POI fallback error:', err);
      return [];
    }
  }

  private mapType(tags: any): string {
    if (tags?.amenity === 'school' || tags?.amenity === 'university')
      return 'school';
    if (tags?.amenity === 'hospital' || tags?.amenity === 'clinic')
      return 'hospital';
    if (tags?.shop === 'supermarket') return 'supermarket';
    if (tags?.amenity === 'restaurant') return 'restaurant';
    if (tags?.amenity === 'bank') return 'bank';
    if (tags?.highway === 'bus_stop') return 'bus_station';
    if (tags?.amenity === 'marketplace') return 'market';
    if (tags?.leisure === 'park') return 'park';
    return 'other';
  }

  private mapTypeName(tags: any): string {
    const names: Record<string, string> = {
      school: 'Trường học',
      hospital: 'Bệnh viện',
      supermarket: 'Siêu thị',
      restaurant: 'Quán ăn',
      bank: 'Ngân hàng',
      bus_station: 'Trạm xe buýt',
      market: 'Chợ',
      park: 'Công viên',
    };
    return names[this.mapType(tags)] || 'Địa điểm';
  }

  private buildSummary(overall: number, scores: any): string {
    const level =
      overall >= 80
        ? 'rất tốt'
        : overall >= 65
          ? 'khá tốt'
          : overall >= 50
            ? 'trung bình'
            : 'hạn chế';
    const pros: string[] = [],
      cons: string[] = [];
    if (scores.convenienceScore >= 65) pros.push('tiện nghi cao');
    else cons.push('ít tiện ích xung quanh');
    if (scores.transportScore >= 65) pros.push('giao thông thuận tiện');
    else cons.push('hạn chế phương tiện công cộng');
    if (scores.safetyScore >= 65) pros.push('an ninh tốt');
    if (scores.noiseScore >= 65) pros.push('yên tĩnh');
    else cons.push('khu vực khá ồn ào');
    return `Khu vực ${level}.${pros.length ? ' Ưu điểm: ' + pros.join(', ') + '.' : ''}${cons.length ? ' Hạn chế: ' + cons.join(', ') + '.' : ''}`;
  }
}
