const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function buildPointFromBody(body) {
  const lat = parseNumber(body.lat, 0);
  const lng = parseNumber(body.lng, 0);

  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
}

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function hashOtp(otp) {
  return bcrypt.hash(String(otp), 10);
}

function buildResetEmail({ name, otp }) {
  return {
    subject: 'Your password reset OTP',
    text: `Hello ${name || 'user'},\n\nYour password reset OTP is ${otp}. It will expire in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Password Reset OTP</h2>
        <p>Hello ${name || 'user'},</p>
        <p>Your password reset OTP is <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong>.</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  };
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    department: user.department,
    location: user.location,
    points: user.points,
    created_at: user.createdAt || user.created_at
  };
}

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone, lat, lng } = req.body;

  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error('name, email, phone, and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedPhone = String(phone).trim();

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
  }).lean();
  if (existingUser) {
    res.status(409);
    throw new Error('User with this email or mobile number already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash,
    role: 'citizen',
    location: buildPointFromBody({ lat, lng }),
    points: 0
  });

  const token = createToken(user._id.toString());

  res.status(201).json({
    message: 'Citizen account created',
    token,
    user: sanitizeUser(user.toObject())
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = createToken(user._id.toString());
  const userObject = user.toObject();
  delete userObject.passwordHash;

  res.json({
    message: 'Login successful',
    token,
    user: sanitizeUser(userObject)
  });
});

const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('email is required');
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    res.json({
      message: 'If the email exists, a password reset OTP has been sent.'
    });
    return;
  }

  const otp = generateOtp();
  const passwordResetOtpHash = await hashOtp(otp);
  const passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.passwordResetOtpHash = passwordResetOtpHash;
  user.passwordResetOtpExpiresAt = passwordResetOtpExpiresAt;
  await user.save();

  await sendEmail({
    to: user.email,
    ...buildResetEmail({ name: user.name, otp })
  });

  res.json({
    message: 'Password reset OTP has been sent to your email.'
  });
});

const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    res.status(400);
    throw new Error('email, otp, password, and confirmPassword are required');
  }

  if (password !== confirmPassword) {
    res.status(400);
    throw new Error('Password and confirm password do not match');
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +passwordResetOtpHash +passwordResetOtpExpiresAt');

  if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
    res.status(400);
    throw new Error('OTP is invalid or expired');
  }

  if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    await user.save();
    res.status(400);
    throw new Error('OTP is expired. Please request a new one.');
  }

  const otpMatches = await bcrypt.compare(String(otp), user.passwordResetOtpHash);
  if (!otpMatches) {
    res.status(400);
    throw new Error('OTP is invalid or expired');
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  await user.save();

  res.json({
    message: 'Password updated successfully'
  });
});

module.exports = {
  signup,
  signupCitizen: signup,
  login,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  createToken,
  sanitizeUser
};
