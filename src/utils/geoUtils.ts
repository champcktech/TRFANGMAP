/**
 * Utility functions for Geographic Coordinates (Latitude / Longitude)
 * and Google Maps Navigation Links for PEA Electrical Transformers.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * สร้าง URL สำหรับเปิดนำทางด้วย Google Maps Directions
 */
export function getGoogleMapsNavUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * สร้าง URL สำหรับเปิดดูตำแหน่งบน Google Maps Search
 */
export function getGoogleMapsViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * จัดรูปแบบพิกัด Lat, Long เป็นข้อความที่อ่านง่าย
 */
export function formatLatLng(lat?: number, lng?: number): string {
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    return '';
  }
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * ตรวจสอบความถูกต้องของพิกัด Lat, Long
 * (ประเทศไทย Lat อยู่ช่วง ~5.5 ถึง ~20.5, Long อยู่ช่วง ~97.3 ถึง ~105.7)
 */
export function isValidLatLng(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
}

/**
 * แปลงข้อความที่ผู้ใช้วาง (เช่น จาก Google Maps, ลิงก์, หรือ DMS) ให้เป็นตัวเลข Lat, Long
 */
export function parseLatLngInput(input: string): { latitude?: number; longitude?: number } | null {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // 1. Google Maps URL pattern: /@19.912345,99.213456 or ?q=19.912345,99.213456 or destination=19.912345,99.213456
  const urlMatch = str.match(/(@|q=|destination=|query=|\/place\/)(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[2]);
    const lng = parseFloat(urlMatch[3]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 2. Simple decimal pair: "19.912345, 99.213456" or "19.912345 99.213456" or "19.912345,99.213456"
  const pairMatch = str.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 3. DMS pattern: e.g. 19°55'02.8"N 99°12'52.3"E
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)?["\s]*([NSEW])/gi;
  const matches = [...str.matchAll(dmsRegex)];
  if (matches.length >= 2) {
    let lat: number | undefined;
    let lng: number | undefined;

    matches.forEach(m => {
      const deg = parseFloat(m[1]);
      const min = parseFloat(m[2]);
      const sec = m[3] ? parseFloat(m[3]) : 0;
      const dir = m[4].toUpperCase();

      let decimal = deg + min / 60 + sec / 3600;
      if (dir === 'S' || dir === 'W') decimal = -decimal;

      if (dir === 'N' || dir === 'S') lat = decimal;
      if (dir === 'E' || dir === 'W') lng = decimal;
    });

    if (lat !== undefined && lng !== undefined && isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

/**
 * ฟังก์ชันดึงพิกัด GPS ปัจจุบันจากเบราว์เซอร์
 */
export function getCurrentDeviceLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด Geolocation'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      error => {
        let msg = 'ไม่สามารถดึงตำแหน่งพิกัดได้';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'กรุณาอนุญาตการเข้าถึงตำแหน่งพิกัด (Location Access) ในเบราว์เซอร์';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'ไม่พบสัญญาณตำแหน่งพิกัดในขณะนี้';
        } else if (error.code === error.TIMEOUT) {
          msg = 'หมดเวลาในการค้นหาตำแหน่งพิกัด';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}
