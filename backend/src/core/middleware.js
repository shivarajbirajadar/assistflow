import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { env, ACTOR_TYPES } from '../config/index.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from './helpers.js';

// ---------- Auth: owner logs in with email + password ----------
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated');

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired. Please log in again');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User no longer exists');

  req.user = user;
  next();
});

// ---------- Actor: who is working right now (assistant name + ID, or owner) ----------
// The frontend sends the ID in the "x-actor-id" header after the "Who is working?" popup.
export const attachActor = (req, res, next) => {
  const id = (req.header('x-actor-id') || '').trim().toUpperCase();
  req.actor = null;

  if (id && req.user) {
    if (id === String(req.user.actorId).toUpperCase()) {
      req.actor = { type: ACTOR_TYPES.OWNER, id: req.user.actorId, name: req.user.name };
    } else {
      const assistant = req.user.assistants.find((a) => a.assistantId === id);
      if (assistant) {
        req.actor = {
          type: ACTOR_TYPES.ASSISTANT,
          id: assistant.assistantId,
          name: assistant.name,
        };
      }
    }
  }
  next();
};

// Use on routes that change data
export const requireActor = (req, res, next) => {
  if (!req.actor) {
    return next(new ApiError(403, 'Please enter who is working (name and ID) first'));
  }
  next();
};

// ---------- Simple body check ----------
export const requireBody =
  (...fields) =>
  (req, res, next) => {
    const missing = fields.filter(
      (f) => req.body?.[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length) {
      return next(new ApiError(400, `Missing field(s): ${missing.join(', ')}`));
    }
    next();
  };

// ---------- Rate limits ----------
const limitMessage = (message) => ({ success: false, message });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many requests. Please try again shortly.'),
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many AI requests. Please wait a minute.'),
});

// ---------- 404 + error handler ----------
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate value';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status >= 500 && env.NODE_ENV === 'production' ? 'Something went wrong' : message,
  });
};