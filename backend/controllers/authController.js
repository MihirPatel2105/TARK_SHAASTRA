const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

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

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    location: user.location,
    points: user.points,
    created_at: user.createdAt || user.created_at
  };
}

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, lat, lng } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('name, email, and password are required');
  }

  const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existingUser) {
    res.status(409);
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: String(email).toLowerCase().trim(),
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

module.exports = {
  signup,
  signupCitizen: signup,
  login,
  createToken,
  sanitizeUser
};
