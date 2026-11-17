import User from '../models/User.js';
import { ApiError, asyncHandler, sendSuccess, signToken } from '../core/helpers.js';

// ---------- Register ----------
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, title, company } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    title,
    company,
  });

  const token = signToken(user._id);

  sendSuccess(
    res,
    {
      token,
      user: user.toSafeJSON(),
    },
    201
  );
});

// ---------- Login ----------
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user._id);

  sendSuccess(res, {
    token,
    user: user.toSafeJSON(),
  });
});

// ---------- Get Current User ----------
export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, {
    user: req.user.toSafeJSON(),
  });
});