import { Injectable } from '@nestjs/common';

// Cấu hình trọng số (weight) và bán kính tối ưu (radius - đơn vị: mét) cho từng loại Địa điểm công cộng (POI)
// Trọng số thể hiện mức độ quan trọng của tiện ích, bán kính là khoảng cách lý tưởng từ phòng trọ đến tiện ích đó.
const POI_CONFIG: Record<string, { weight: number; radius: number }> = {
  school: { weight: 1.5, radius: 500 }, // Trường học: Trọng số 1.5, bán kính tối ưu 500m
  hospital: { weight: 1.3, radius: 1000 }, // Bệnh viện: Trọng số 1.3, bán kính tối ưu 1000m
  supermarket: { weight: 1.2, radius: 500 }, // Siêu thị: Trọng số 1.2, bán kính tối ưu 500m
  restaurant: { weight: 1.0, radius: 300 }, // Nhà hàng/Quán ăn: Trọng số 1.0, bán kính tối ưu 300m
  bank: { weight: 1.0, radius: 500 }, // Ngân hàng/ATM: Trọng số 1.0, bán kính tối ưu 500m
  bus_station: { weight: 1.4, radius: 300 }, // Trạm xe buýt: Trọng số 1.4, bán kính tối ưu 300m
  market: { weight: 1.1, radius: 500 }, // Chợ: Trọng số 1.1, bán kính tối ưu 500m
  park: { weight: 0.7, radius: 500 }, // Công viên: Trọng số 0.7, bán kính tối ưu 500m
};

@Injectable()
export class NeighborhoodService {
  // Hàm phân tích môi trường xung quanh (tiện ích, giao thông, an ninh, tiếng ồn) từ tọa độ GPS của phòng trọ
  async analyze(lat: number, lng: number) {
    // 1. Gọi API Overpass (OpenStreetMap) để tìm các địa điểm tiện ích (POI) trong bán kính tối đa 1000m
    let pois = await this.fetchPOIs(lat, lng, 1000);

    // 2. Định dạng lại tên gọi và loại bỏ các địa điểm trùng lặp trong danh sách trả về
    pois = this.deduplicateAndFormatPois(pois);

    // 3. Tính điểm tiêu chí "Tiện nghi cuộc sống" dựa trên các POI: siêu thị, quán ăn, chợ và ngân hàng
    const convenienceScore = this.calcScore(pois, [
      'supermarket',
      'restaurant',
      'market',
      'bank',
    ]);

    // 4. Tính điểm tiêu chí "Giao thông công cộng" dựa trên khoảng cách tới trạm xe buýt gần nhất
    const transportScore = this.calcTransport(pois);

    // 5. Tính điểm tiêu chí "Mức độ an ninh" dựa vào sự hiện diện của bệnh viện, trường học và mật độ quán ăn
    const safetyScore = this.calcSafety(pois);

    // 6. Tính điểm tiêu chí "Mức độ yên tĩnh" (Hạn chế tiếng ồn) dựa vào mật độ quán ăn và sự hiện diện của chợ
    const noiseScore = this.calcNoise(pois);

    // 7. Tính điểm đánh giá tổng quan (overall) theo công thức trung bình có trọng số (tiện nghi: 35%, giao thông: 30%, an ninh: 25%, tiếng ồn: 10%)
    const overall = Math.round(
      convenienceScore * 0.35 +
        transportScore * 0.3 +
        safetyScore * 0.25 +
        noiseScore * 0.1,
    );

    // 8. Xếp hạng khu vực (grade) từ A đến D dựa trên tổng điểm đạt được
    const grade =
      overall >= 80 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : 'D';

    // Trả về kết quả phân tích khu vực chi tiết cho Frontend
    return {
      overall, // Tổng điểm (0-100)
      grade, // Xếp hạng (A, B, C, D)
      scores: { convenienceScore, transportScore, safetyScore, noiseScore }, // Điểm số từng tiêu chí
      nearbyPlaces: pois.slice(0, 15), // Danh sách 15 địa điểm gần nhất để hiển thị trực quan
      summary: this.buildSummary(overall, {
        // Đoạn văn tóm tắt ưu nhược điểm của khu vực trọ
        convenienceScore,
        transportScore,
        safetyScore,
        noiseScore,
      }),
    };
  }

  // ── Haversine Formula ─────────────────────────────────────────
  // Công thức Haversine để tính khoảng cách đường chim bay chính xác giữa 2 tọa độ GPS (Đơn vị kết quả: mét)
  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6_371_000; // Bán kính Trái Đất trung bình (mét)
    const toRad = (x: number) => (x * Math.PI) / 180; // Hàm đổi độ sang radian

    const dLat = toRad(lat2 - lat1); // Độ chênh lệch vĩ độ (rad)
    const dLng = toRad(lng2 - lng1); // Độ chênh lệch kinh độ (rad)
    // Áp dụng công thức lượng giác Haversine a = sin(dLat/2)^2 + cos(Lat1) * cos(Lat2) * sin(dLng/2)^2
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Tính khoảng cách thực tế (mét) d = 2 * R * atan2(sqrt(a), sqrt(1-a))
  }

  // ── Distance Decay Function ───────────────────────────────────
  // Hàm tính toán độ suy giảm giá trị theo khoảng cách: f(d) = e^(-λd) với λ = 1/r₀
  // Địa điểm càng gần điểm khảo sát (khoảng cách d nhỏ) -> giá trị decay tiến về 1 (giá trị tiện ích cao)
  // Địa điểm càng xa điểm khảo sát (khoảng cách d lớn) -> giá trị decay tiến về 0 (đóng góp không đáng kể)
  private distanceDecay(distance: number, optimalRadius: number): number {
    const lambda = 1 / optimalRadius; // Hệ số suy giảm λ dựa trên bán kính tối ưu
    return Math.exp(-lambda * distance); // Hàm số mũ tự nhiên e
  }

  // Hàm tính điểm số dựa trên danh sách địa điểm (POI) và các loại tiện ích cần tính
  private calcScore(pois: any[], types: string[]): number {
    let score = 0, // Điểm số tích lũy đạt được
      maxPossible = 0; // Điểm số tối đa lý thuyết có thể đạt được để làm mốc chia tỷ lệ phần trăm

    // Duyệt qua từng loại tiện ích (ví dụ: siêu thị, chợ...)
    types.forEach((type) => {
      const cfg = POI_CONFIG[type]; // Lấy cấu hình trọng số & bán kính tối ưu của loại tiện ích đó
      if (!cfg) return;

      maxPossible += cfg.weight * 10; // Điểm tối đa giả định: mỗi loại tiện ích đóng góp tối đa là weight * 10

      // Lọc ra các địa điểm thuộc loại này, giới hạn tối đa 5 địa điểm gần nhất để tránh spam điểm
      pois
        .filter((p) => p.type === type)
        .slice(0, 5)
        .forEach((poi) => {
          const decay = this.distanceDecay(poi.distance, cfg.radius); // Tính mức độ suy giảm dựa trên khoảng cách thực tế
          score += cfg.weight * decay * 10; // Cộng dồn điểm thực tế đã nhân với hệ số suy giảm khoảng cách
        });
    });

    // Nếu có tiện ích hợp lệ, tính tỷ lệ % điểm đạt được (tối đa 100 điểm), ngược lại mặc định trả về 50 điểm
    return maxPossible > 0
      ? Math.min(100, Math.round((score / maxPossible) * 100))
      : 50;
  }

  // Hàm tính điểm tiêu chí "Giao thông công cộng" dựa trên khoảng cách tới trạm dừng xe buýt gần nhất
  private calcTransport(pois: any[]): number {
    // Tìm các trạm xe buýt trong danh sách địa điểm xung quanh
    const stops = pois.filter((p) => p.type === 'bus_station');
    if (stops.length === 0) return 30; // Không có trạm xe buýt nào trong bán kính 1000m: 30 điểm
    const d = stops[0].distance; // Lấy khoảng cách tới trạm xe buýt gần nhất (danh sách đã sắp xếp tăng dần theo khoảng cách)
    if (d < 200) return 100; // Dưới 200m: Quá thuận tiện - 100 điểm
    if (d < 400) return 85; // Dưới 400m: Rất gần - 85 điểm
    if (d < 600) return 70; // Dưới 600m: Đi bộ dễ dàng - 70 điểm
    if (d < 1000) return 55; // Dưới 1000m: Tạm chấp nhận được - 55 điểm
    return 35; // Trên 1000m: Khá xa - 35 điểm
  }

  // Hàm tính điểm tiêu chí "Mức độ an ninh" khu vực
  private calcSafety(pois: any[]): number {
    let score = 55; // Điểm an ninh cơ bản ban đầu là 55 điểm

    // Nếu có bệnh viện/phòng khám gần trọ trong vòng 1000m: cộng thêm 15 điểm an tâm y tế
    if (pois.some((p) => p.type === 'hospital' && p.distance < 1000))
      score += 15;

    // Nếu có trường học trong vòng 800m: cộng thêm 15 điểm (khu vực gần trường học thường được ưu tiên tuần tra an ninh)
    if (pois.some((p) => p.type === 'school' && p.distance < 800)) score += 15;

    // Đếm số lượng nhà hàng/quán ăn xung quanh. Mật độ ăn uống cao mang lại sinh khí, đông người qua lại giúp giảm tỷ lệ tệ nạn.
    const restCount = pois.filter((p) => p.type === 'restaurant').length;
    if (restCount > 8)
      score += 10; // Nhiều quán ăn (> 8): cộng 10 điểm
    else if (restCount > 4) score += 5; // Vừa phải (> 4): cộng 5 điểm

    return Math.min(100, score); // Điểm an ninh tối đa không vượt quá 100
  }

  // Hàm tính điểm tiêu chí "Mức độ yên tĩnh" (Tránh tiếng ồn)
  private calcNoise(pois: any[]): number {
    let score = 80; // Điểm yên tĩnh cơ bản ban đầu là 80 điểm

    // Đếm số lượng nhà hàng/quán ăn. Nếu quá nhiều quán ăn, khu vực sẽ rất nhộn nhịp, dễ bị ồn ào về đêm.
    const restCount = pois.filter((p) => p.type === 'restaurant').length;

    // Có chợ dân sinh hay không (Chợ thường rất ồn ào vào sáng sớm)
    const hasMarket = pois.some((p) => p.type === 'market');

    if (restCount > 10)
      score -= 25; // Hơn 10 quán ăn: trừ mạnh 25 điểm tiếng ồn
    else if (restCount > 5) score -= 15; // Hơn 5 quán ăn: trừ 15 điểm tiếng ồn

    if (hasMarket) score -= 15; // Có chợ xung quanh: trừ 15 điểm tiếng ồn

    return Math.max(20, score); // Điểm yên tĩnh tối thiểu được giới hạn ở mức 20 điểm
  }

  // Hàm gọi API Overpass (dịch vụ OpenStreetMap công cộng, miễn phí) để lấy dữ liệu bản đồ
  private async fetchPOIs(lat: number, lng: number, radius: number) {
    // Xây dựng câu truy vấn theo cú pháp Overpass QL
    // Tìm kiếm các POI như trường học, bệnh viện, phòng khám, siêu thị, nhà hàng, ngân hàng, trạm xe buýt, chợ, công viên trong bán kính chỉ định
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
      // Danh sách các máy chủ Overpass API dự phòng (nếu máy chủ chính bị lỗi hoặc quá tải)
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];

      let data: any = null;
      // Thử gọi lần lượt từng máy chủ cho đến khi thành công có dữ liệu
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'text/plain' },
          });
          if (!res.ok) continue; // Nếu lỗi HTTP, bỏ qua thử máy chủ tiếp theo
          data = await res.json();
          if (data?.elements?.length) break; // Nếu có dữ liệu hợp lệ, dừng vòng lặp thử
        } catch {
          continue; // Gặp lỗi kết nối, chuyển qua máy chủ tiếp theo
        }
      }

      // Xử lý và chuẩn hóa dữ liệu thô nhận về từ Overpass API thành cấu trúc nội bộ dễ xử lý
      const overpassPois = (data?.elements || [])
        .map((el: any) => ({
          // Ưu tiên lấy tên tiếng Việt, nếu không có lấy tên mặc định, cuối cùng lấy tên phân loại tiếng Việt mặc định
          name:
            el.tags?.['name:vi'] || el.tags?.name || this.mapTypeName(el.tags),
          type: this.mapType(el.tags), // Xác định phân loại của địa điểm
          // Tính khoảng cách từ phòng trọ đến địa điểm này bằng công thức Haversine
          distance: Math.round(
            this.haversine(
              lat,
              lng,
              el.lat ?? el.center?.lat, // Lấy vĩ độ (đối với điểm node hoặc tâm diện tích way/relation)
              el.lon ?? el.center?.lon, // Lấy kinh độ
            ),
          ),
          lat: el.lat ?? el.center?.lat,
          lng: el.lon ?? el.center?.lon,
        }))
        // Loại bỏ các địa điểm không xác định được loại ("other"), hoặc khoảng cách/tọa độ bị lỗi không hợp lệ
        .filter(
          (p: any) =>
            p.type !== 'other' &&
            Number.isFinite(p.distance) &&
            p.distance >= 0 &&
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lng),
        )
        // Sắp xếp danh sách địa điểm theo khoảng cách từ gần đến xa
        .sort((a: any, b: any) => a.distance - b.distance);

      // Nếu có kết quả trả về, sử dụng danh sách này
      if (overpassPois.length > 0) {
        return overpassPois;
      }

      // Trong trường hợp Overpass bị giới hạn lượt gọi (Rate-limit) hoặc trả về rỗng, chuyển qua cơ chế dự phòng Nominatim
      return this.fetchPOIsFromNominatim(lat, lng, radius);
    } catch (err) {
      console.error('Overpass API error:', err);
      // Gặp lỗi hệ thống cũng chuyển qua cơ chế dự phòng Nominatim API
      return this.fetchPOIsFromNominatim(lat, lng, radius);
    }
  }

  // Cơ chế dự phòng: Lấy danh sách địa điểm (POI) từ Nominatim API (OpenStreetMap Search)
  private async fetchPOIsFromNominatim(
    lat: number,
    lng: number,
    radius: number,
  ) {
    // 1 độ vĩ độ khoảng 111,320 mét. Tính toán độ lệch vĩ độ tương ứng bán kính tìm kiếm.
    const deltaLat = radius / 111_320;
    // Độ lệch kinh độ phụ thuộc vào vĩ độ hiện tại do Trái Đất hình cầu dẹt
    const deltaLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180));

    // Xác định khung giới hạn địa lý (bounding box) xung quanh tọa độ phòng trọ
    const left = lng - deltaLng;
    const right = lng + deltaLng;
    const top = lat + deltaLat;
    const bottom = lat - deltaLat;
    const viewbox = `${left},${top},${right},${bottom}`; // Chuỗi biểu diễn khung giới hạn

    // Các từ khóa tương ứng để tìm kiếm trên Nominatim
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
      // Thực hiện gọi API tìm kiếm đồng thời cho tất cả các từ khóa tiện ích để tăng tốc độ
      const responses = await Promise.all(
        Object.entries(searchTerms).map(async ([type, q]) => {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
              q,
            )}&bounded=1&limit=6&viewbox=${encodeURIComponent(viewbox)}`,
            {
              headers: {
                'User-Agent': 'RoomMatchingApp/1.0', // Khai báo User-Agent hợp lệ theo chính sách của OSM
              },
            },
          );
          if (!res.ok) return []; // Nếu lỗi, trả về mảng rỗng cho loại từ khóa này
          const data = await res.json();
          // Chuyển đổi dữ liệu thô từ Nominatim thành cấu trúc dữ liệu chung của hệ thống
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

      // Gộp mảng các kết quả tìm kiếm lại, lọc bỏ các địa điểm nằm ngoài bán kính quy định và sắp xếp theo khoảng cách
      return responses
        .flat()
        .filter((p: any) => Number.isFinite(p.distance) && p.distance <= radius)
        .sort((a: any, b: any) => a.distance - b.distance);
    } catch (err) {
      console.error('Nominatim POI fallback error:', err);
      return [];
    }
  }

  // Hàm chuyển đổi các nhãn phân loại thô từ OpenStreetMap (OSM tags) thành loại nội bộ của hệ thống
  private mapType(tags: any): string {
    if (tags?.amenity === 'school' || tags?.amenity === 'university')
      return 'school'; // Trường học hoặc đại học
    if (tags?.amenity === 'hospital' || tags?.amenity === 'clinic')
      return 'hospital'; // Bệnh viện hoặc phòng khám y tế
    if (tags?.shop === 'supermarket') return 'supermarket'; // Siêu thị tiện lợi
    if (tags?.amenity === 'restaurant') return 'restaurant'; // Quán ăn, nhà hàng
    if (tags?.amenity === 'bank') return 'bank'; // Ngân hàng, điểm ATM
    if (tags?.highway === 'bus_stop') return 'bus_station'; // Điểm dừng xe buýt
    if (tags?.amenity === 'marketplace') return 'market'; // Chợ dân sinh
    if (tags?.leisure === 'park') return 'park'; // Công viên giải trí, mảng xanh
    return 'other'; // Các địa điểm khác không quan tâm
  }

  // Hàm ánh xạ nhãn phân loại sang tên hiển thị tiếng Việt tương ứng (dành cho các POI không có tên riêng trong DB)
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
    return names[this.mapType(tags)] || 'Địa điểm'; // Mặc định trả về chữ 'Địa điểm' nếu không khớp
  }

  // Hàm xây dựng câu tóm tắt tiếng Việt về các ưu nhược điểm nổi bật của khu vực xung quanh phòng trọ
  private buildSummary(overall: number, scores: any): string {
    // Đánh giá mức độ tiện ích chung dựa trên tổng điểm overall
    const level =
      overall >= 80
        ? 'rất tốt'
        : overall >= 65
          ? 'khá tốt'
          : overall >= 50
            ? 'trung bình'
            : 'hạn chế';

    const pros: string[] = [], // Mảng chứa danh sách các ưu điểm
      cons: string[] = []; // Mảng chứa danh sách các hạn chế

    // Đánh giá tiêu chí tiện nghi cuộc sống
    if (scores.convenienceScore >= 65) pros.push('tiện nghi cao');
    else cons.push('ít tiện ích xung quanh');

    // Đánh giá tiêu chí phương tiện giao thông công cộng
    if (scores.transportScore >= 65) pros.push('giao thông thuận tiện');
    else cons.push('hạn chế phương tiện công cộng');

    // Đánh giá tiêu chí an ninh
    if (scores.safetyScore >= 65) pros.push('an ninh tốt');

    // Đánh giá tiêu chí độ yên tĩnh (mức độ tiếng ồn thấp)
    if (scores.noiseScore >= 65) pros.push('yên tĩnh');
    else cons.push('khu vực khá ồn ào');

    // Ghép các mảng ưu/nhược điểm thành một chuỗi văn bản hoàn chỉnh để trả về
    return `Khu vực ${level}.${pros.length ? ' Ưu điểm: ' + pros.join(', ') + '.' : ''}${cons.length ? ' Hạn chế: ' + cons.join(', ') + '.' : ''}`;
  }

  // Hàm lọc bỏ trùng lặp địa điểm và định dạng lại tên hiển thị của các trạm xe buýt
  private deduplicateAndFormatPois(pois: any[]): any[] {
    const seen = new Set<string>(); // Sử dụng Set để lưu vết các khóa duy nhất (tránh trùng)
    const result: any[] = []; // Mảng chứa kết quả sau khi đã lọc

    for (const poi of pois) {
      // 1. Nếu là trạm xe buýt và tên gọi thô chưa chứa các từ khóa liên quan đến trạm dừng, tiến hành tiền xử lý tên cho rõ nghĩa
      if (poi.type === 'bus_station') {
        const nameLower = poi.name.toLowerCase();
        if (
          !nameLower.includes('trạm') &&
          !nameLower.includes('tram') &&
          !nameLower.includes('bến') &&
          !nameLower.includes('ben') &&
          !nameLower.includes('bus')
        ) {
          poi.name = `Trạm xe buýt gần ${poi.name}`; // Định dạng lại tên trạm
        }
      }

      // 2. Chuẩn hóa tên địa điểm (xóa khoảng trắng thừa, đưa về chữ thường)
      const normName = poi.name.trim().toLowerCase().replace(/\s+/g, ' ');
      // Tạo khóa định danh duy nhất kết hợp giữa loại tiện ích và tên đã chuẩn hóa
      const key = `${poi.type}_${normName}`;

      // Nếu khóa này chưa tồn tại trong danh sách đã duyệt qua, thêm vào danh sách kết quả
      if (!seen.has(key)) {
        seen.add(key);
        result.push(poi);
      }
    }

    return result; // Trả về danh sách địa điểm sạch, không trùng lặp
  }
}
