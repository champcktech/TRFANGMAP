/**
 * Utilities for sharing diagram sheets via compressed/encoded URL hashes
 * and syncing multi-sheet states across devices.
 */
import { DiagramSheet } from '../types';

/**
 * Encode diagram sheets into a safe URL hash payload
 */
export function encodeSheetsToUrlHash(sheets: DiagramSheet[], activeSheetId?: string): string {
  try {
    const payload = {
      v: 2,
      sheets,
      activeSheetId,
      exportedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(payload);
    // Use encodeURIComponent + btoa with unicode safety
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    const base64 = btoa(utf8Bytes);
    return base64;
  } catch (err) {
    console.error('Failed to encode sheets to URL hash', err);
    return '';
  }
}

/**
 * Decode diagram sheets from a URL hash or search param payload
 */
export function decodeSheetsFromPayload(encodedStr: string): { sheets: DiagramSheet[]; activeSheetId?: string } | null {
  try {
    if (!encodedStr || typeof encodedStr !== 'string') return null;
    const cleanStr = encodedStr.replace(/^#/, '').replace(/^data=/, '').replace(/^payload=/, '').trim();
    if (!cleanStr) return null;

    const binStr = atob(cleanStr);
    const decodedUri = Array.from(binStr)
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    const jsonStr = decodeURIComponent(decodedUri);
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed)) {
      return { sheets: parsed };
    }
    if (parsed && Array.isArray(parsed.sheets)) {
      return {
        sheets: parsed.sheets,
        activeSheetId: parsed.activeSheetId
      };
    }
  } catch (err) {
    console.error('Failed to decode sheets payload', err);
  }
  return null;
}
