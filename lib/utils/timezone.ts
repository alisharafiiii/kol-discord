/**
 * Timezone utility functions for EDT (Eastern Daylight Time)
 * EDT is UTC-4 hours
 */

export const EDT_OFFSET_HOURS = -4;

/**
 * Convert a UTC date to EDT
 */
export function utcToEdt(utcDate: Date): Date {
  const edtDate = new Date(utcDate.getTime());
  edtDate.setHours(edtDate.getHours() + EDT_OFFSET_HOURS); // Add negative offset
  return edtDate;
}

/**
 * Convert an EDT date to UTC
 */
export function edtToUtc(edtDate: Date): Date {
  const utcDate = new Date(edtDate.getTime());
  utcDate.setHours(utcDate.getHours() - EDT_OFFSET_HOURS); // Subtract negative offset
  return utcDate;
}

/**
 * Get current date/time in EDT
 */
export function getCurrentEdt(): Date {
  return utcToEdt(new Date());
}

/**
 * Get EDT midnight for a given date (or today if not specified)
 */
export function getEdtMidnight(daysAgo = 0): Date {
  const edt = getCurrentEdt();
  edt.setDate(edt.getDate() - daysAgo);
  edt.setHours(0, 0, 0, 0);
  return edt;
}

/**
 * Format date to EDT ISO string with timezone indicator
 */
export function toEdtIsoString(date: Date): string {
  const edt = utcToEdt(date);
  const year = edt.getFullYear();
  const month = String(edt.getMonth() + 1).padStart(2, '0');
  const day = String(edt.getDate()).padStart(2, '0');
  const hours = String(edt.getHours()).padStart(2, '0');
  const minutes = String(edt.getMinutes()).padStart(2, '0');
  const seconds = String(edt.getSeconds()).padStart(2, '0');
  const ms = String(edt.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}EDT`;
}

/**
 * Get EDT date string in YYYY-MM-DD format
 */
export function getEdtDateString(date: Date = new Date()): string {
  const edt = utcToEdt(date);
  const year = edt.getFullYear();
  const month = String(edt.getMonth() + 1).padStart(2, '0');
  const day = String(edt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get EDT hour (0-23)
 */
export function getEdtHour(date: Date): number {
  const edt = utcToEdt(date);
  return edt.getHours();
}

/**
 * Create a date from EDT components
 */
export function createEdtDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  // Create a date in local time, then adjust for EDT
  const localDate = new Date(year, month - 1, day, hour, minute, second);
  // Get the UTC equivalent of this EDT time
  return edtToUtc(localDate);
}

/**
 * Parse an EDT date string and return UTC Date
 */
export function parseEdtDate(dateString: string): Date {
  // Remove EDT suffix if present
  const cleanDateString = dateString.replace(/EDT$/, '');
  const localDate = new Date(cleanDateString);
  // Treat as EDT and convert to UTC
  return edtToUtc(localDate);
} 