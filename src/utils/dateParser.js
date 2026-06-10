/**
 * Parses natural language notes to extract the next follow-up date.
 * Returns date in 'YYYY-MM-DD' format, or null if no date is detected.
 * 
 * @param {string} text 
 * @returns {string|null}
 */
export function parseFollowUpDate(text) {
  if (!text) return null;
  
  const normalized = text.toLowerCase().trim();
  const today = new Date();
  
  // Helper to format date to YYYY-MM-DD local time
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 1. "day after tomorrow"
  if (/\bday after tomorrow\b/.test(normalized)) {
    const date = new Date(today);
    date.setDate(today.getDate() + 2);
    return formatDate(date);
  }

  // 2. "tomorrow"
  if (/\btomorrow\b/.test(normalized)) {
    const date = new Date(today);
    date.setDate(today.getDate() + 1);
    return formatDate(date);
  }

  // 3. "next week"
  if (/\bnext week\b/.test(normalized)) {
    const date = new Date(today);
    date.setDate(today.getDate() + 7);
    return formatDate(date);
  }

  // 4. "in X days" or "after X days"
  const inDaysMatch = normalized.match(/\bin\s+(\d+)\s+days?\b/) || normalized.match(/\bafter\s+(\d+)\s+days?\b/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    if (!isNaN(days)) {
      const date = new Date(today);
      date.setDate(today.getDate() + days);
      return formatDate(date);
    }
  }

  // 5. Weekdays: "next monday", "on tuesday", "this friday", etc.
  const weekdays = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };

  for (const [dayName, dayIndex] of Object.entries(weekdays)) {
    const regex = new RegExp(`\\b(next|on|this)?\\s*${dayName}\\b`);
    const match = normalized.match(regex);
    if (match) {
      const modifier = match[1] || '';
      const currentDay = today.getDay();
      let daysToAdd = dayIndex - currentDay;
      
      if (modifier === 'next') {
        // "next Monday" means the monday of next week
        daysToAdd = (dayIndex + 7 - currentDay) % 7;
        if (daysToAdd === 0) daysToAdd = 7;
        else daysToAdd += 7; // Add a whole week
      } else {
        // "on Monday" or just "Monday"
        daysToAdd = (dayIndex + 7 - currentDay) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // If today is Monday, "on Monday" usually means next Monday
      }
      
      const date = new Date(today);
      date.setDate(today.getDate() + daysToAdd);
      return formatDate(date);
    }
  }

  // 6. Explicit dates like "15th June", "June 15", "15 June", "25 Dec"
  const months = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  for (const [monthName, monthIndex] of Object.entries(months)) {
    // Matches "June 15", "June 15th", "15 June", "15th June"
    // Also "15 of June"
    const regex1 = new RegExp(`\\b${monthName}\\s+(\\d{1,2})(st|nd|rd|th)?\\b`);
    const regex2 = new RegExp(`\\b(\\d{1,2})(st|nd|rd|th)?\\s*(of)?\\s*${monthName}\\b`);
    
    let match = normalized.match(regex1);
    let day = null;
    if (match) {
      day = parseInt(match[1], 10);
    } else {
      match = normalized.match(regex2);
      if (match) {
        day = parseInt(match[1], 10);
      }
    }

    if (day !== null && !isNaN(day) && day >= 1 && day <= 31) {
      const date = new Date(today);
      date.setMonth(monthIndex);
      date.setDate(day);
      
      // If the parsed date would be in the past (e.g. today is Dec 2026, and user says Jan 15)
      // we assume they mean next year
      if (date < today) {
        date.setFullYear(today.getFullYear() + 1);
      }
      return formatDate(date);
    }
  }

  // 7. Numeric Dates: "15/06/2026", "15-06-2026", "2026-06-15", "15/06" (assumes current year)
  // Check YYYY-MM-DD
  const yyyymmdd = normalized.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10);
    const m = parseInt(yyyymmdd[2], 10) - 1;
    const d = parseInt(yyyymmdd[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return formatDate(date);
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = normalized.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    const m = parseInt(ddmmyyyy[2], 10) - 1;
    const y = parseInt(ddmmyyyy[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return formatDate(date);
  }

  // Check DD/MM or DD-MM (assumes current year)
  const ddmm = normalized.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
  if (ddmm) {
    const d = parseInt(ddmm[1], 10);
    const m = parseInt(ddmm[2], 10) - 1;
    // Ensure it's not confused with other numbers
    // and that month is valid (0 to 11)
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const date = new Date(today.getFullYear(), m, d);
      if (date < today) {
        // If date is past, assume next year (e.g. today is Dec, note says "01/01")
        date.setFullYear(today.getFullYear() + 1);
      }
      if (!isNaN(date.getTime())) return formatDate(date);
    }
  }

  return null;
}
