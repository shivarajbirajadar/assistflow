import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';

// ---------- Errors and responses ----------
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const sendSuccess = (res, data = null, status = 200, meta) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

// ---------- Token ----------
export const signToken = (userId) =>
  jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

// ---------- Pagination ----------
export const parsePagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// ---------- Dates (all seed times are in IST) ----------
const IST_OFFSET_MS = 330 * 60 * 1000;

export const dateFromOffset = (daysOffset, time = '09:00') => {
  const [hours, minutes] = time.split(':').map(Number);
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() + daysOffset,
      hours,
      minutes
    ) - IST_OFFSET_MS
  );
};

// A "0 days ago" time that is later than now is moved slightly into the past
export const daysAgoDate = (days, time = '09:00') => {
  const date = dateFromOffset(-days, time);
  const latest = Date.now() - 5 * 60 * 1000;
  return date.getTime() > latest ? new Date(latest) : date;
};

export const daysFromNowDate = (days, time = '09:00') => dateFromOffset(days, time);

export const daysBetween = (from, to = new Date()) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

// ---------- Misc ----------
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Tiny in-memory cache ----------
const store = new Map();

export const cache = {
  get(key) {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return hit.value;
  },
  set(key, value, ttlMs = 30000) {
    store.set(key, { value, expires: Date.now() + ttlMs });
  },
  del(key) {
    store.delete(key);
  },
  delPrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
  clear() {
    store.clear();
  },
};