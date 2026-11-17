import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisYear,
  isValid,
  parseISO,
} from 'date-fns';


/* =========================================================
   1. CLASS NAMES
   Combines conditional CSS classes.
========================================================= */

export function classNames(...classes) {
  return classes
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}


/* =========================================================
   2. DATE PARSER
   Safely converts date values.
========================================================= */

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date
    ? value
    : typeof value === 'string'
      ? parseISO(value)
      : new Date(value);

  return isValid(date) ? date : null;
}


/* =========================================================
   3. FORMAT DATE
   Example: 17 Nov 2026
========================================================= */

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const date = parseDate(value);

  if (!date) {
    return '—';
  }

  return format(date, pattern);
}


/* =========================================================
   4. FORMAT TIME
   Example: 10:30 AM
========================================================= */

export function formatTime(value) {
  const date = parseDate(value);

  if (!date) {
    return '—';
  }

  return format(date, 'hh:mm a');
}


/* =========================================================
   5. FORMAT DATETIME
   Example: 17 Nov 2026, 10:30 AM
========================================================= */

export function formatDateTime(value) {
  const date = parseDate(value);

  if (!date) {
    return '—';
  }

  return format(date, 'dd MMM yyyy, hh:mm a');
}


/* =========================================================
   6. FORMAT EMAIL DATE
   Today       -> 10:30 AM
   Yesterday   -> Yesterday
   This year   -> 17 Nov
   Other years -> 17 Nov 2025
========================================================= */

export function formatEmailDate(value) {
  const date = parseDate(value);

  if (!date) {
    return '';
  }

  if (isToday(date)) {
    return format(date, 'hh:mm a');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (isThisYear(date)) {
    return format(date, 'dd MMM');
  }

  return format(date, 'dd MMM yyyy');
}


/* =========================================================
   7. TIME AGO
   Example: 5 minutes ago
========================================================= */

export function formatTimeAgo(value) {
  const date = parseDate(value);

  if (!date) {
    return '';
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
  });
}


/* =========================================================
   8. INITIALS
   Example: Kavya Iyer -> KI
========================================================= */

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}


/* =========================================================
   9. TRUNCATE TEXT
========================================================= */

export function truncateText(text = '', maxLength = 100) {
  if (typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}


/* =========================================================
   10. FORMAT NUMBER
   Example: 12500 -> 12,500
========================================================= */

export function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0';
  }

  return new Intl.NumberFormat('en-IN').format(number);
}


/* =========================================================
   11. FORMAT COUNT
   Example: 1200 -> 1.2K
========================================================= */

export function formatCompactNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0';
  }

  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
}


/* =========================================================
   12. GET ERROR MESSAGE
========================================================= */

export function getErrorMessage(error, fallback = 'Something went wrong.') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}


/* =========================================================
   13. NORMALIZE EMAIL
========================================================= */

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}


/* =========================================================
   14. GET DISPLAY NAME
========================================================= */

export function getDisplayName(user) {
  if (!user) {
    return 'Unknown';
  }

  return (
    user.name ||
    user.fullName ||
    user.email ||
    'Unknown'
  );
}


/* =========================================================
   15. SAFE ARRAY
========================================================= */

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}


/* =========================================================
   16. DEBOUNCE UTILITY
========================================================= */

export function debounce(callback, delay = 300) {
  let timer;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}


/* =========================================================
   17. COPY TO CLIPBOARD
========================================================= */

export async function copyToClipboard(value) {
  if (!navigator?.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(String(value));
    return true;
  } catch {
    return false;
  }
}


/* =========================================================
   18. GET CONVERSATION SUBJECT
========================================================= */

export function getConversationSubject(conversation) {
  return (
    conversation?.subject ||
    conversation?.messages?.[0]?.subject ||
    '(No subject)'
  );
}


/* =========================================================
   19. GET LATEST MESSAGE
========================================================= */

export function getLatestMessage(conversation) {
  const messages = ensureArray(conversation?.messages);

  if (messages.length === 0) {
    return null;
  }

  return messages[messages.length - 1];
}


/* =========================================================
   20. GET SENDER NAME
========================================================= */

export function getSenderName(message) {
  if (!message) {
    return 'Unknown sender';
  }

  if (typeof message.from === 'string') {
    return message.from;
  }

  return (
    message.from?.name ||
    message.sender?.name ||
    message.senderName ||
    message.from?.email ||
    message.sender?.email ||
    'Unknown sender'
  );
}