/**
 * Timezone utility functions for EDT (Eastern Daylight Time)
 * EDT is UTC-4 hours
 */

const EDT_OFFSET_HOURS = -4;

/**
 * Convert a UTC date to EDT
 */
function utcToEdt(utcDate) {
  const edtDate = new Date(utcDate.getTime());
  edtDate.setHours(edtDate.getHours() + EDT_OFFSET_HOURS); // Add negative offset
  return edtDate;
}

/**
 * Convert an EDT date to UTC
 */
function edtToUtc(edtDate) {
  const utcDate = new Date(edtDate.getTime());
  utcDate.setHours(utcDate.getHours() - EDT_OFFSET_HOURS); // Subtract negative offset
  return utcDate;
}

/**
 * Get current date/time in EDT
 */
function getCurrentEdt() {
  return utcToEdt(new Date());
}

/**
 * Get EDT midnight for a given date (or today if not specified)
 */
function getEdtMidnight(daysAgo = 0) {
  const edt = getCurrentEdt();
  edt.setDate(edt.getDate() - daysAgo);
  edt.setHours(0, 0, 0, 0);
  return edt;
}

/**
 * Format date to EDT ISO string with timezone indicator
 */
function toEdtIsoString(date) {
  // Convert to EDT
  const edtDate = utcToEdt(date);
  
  // Get the UTC version of this EDT time
  const utcEquivalent = new Date(date.getTime());
  
  // Return the UTC ISO string which represents the correct time
  // This ensures proper parsing later
  return utcEquivalent.toISOString();
}

/**
 * Get EDT date string in YYYY-MM-DD format
 */
function getEdtDateString(date = new Date()) {
  const edt = utcToEdt(date);
  const year = edt.getFullYear();
  const month = String(edt.getMonth() + 1).padStart(2, '0');
  const day = String(edt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get EDT hour (0-23)
 */
function getEdtHour(date) {
  const edt = utcToEdt(date);
  return edt.getHours();
}

module.exports = {
  EDT_OFFSET_HOURS,
  utcToEdt,
  edtToUtc,
  getCurrentEdt,
  getEdtMidnight,
  toEdtIsoString,
  getEdtDateString,
  getEdtHour
}; 