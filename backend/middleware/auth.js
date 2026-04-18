const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const authorizationHeader = req.header('authorization') || '';
  const bearerToken = authorizationHeader.toLowerCase().startsWith('bearer ')
    ? authorizationHeader.slice(7).trim()
    : null;
  const userId = req.header('x-user-id') || req.query.userId;

  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
      if (decoded?.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
        const user = await User.findById(decoded.id).lean();
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (error) {
      // Fall through to legacy x-user-id auth below.
    }
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401);
    return next(new Error('Authentication required. Send a valid bearer token or x-user-id header.'));
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    res.status(401);
    return next(new Error('User not found for provided x-user-id'));
  }

  req.user = user;
  return next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(new Error('Forbidden: insufficient role access'));
    }

    return next();
  };
}

module.exports = {
  protect,
  authorizeRoles
};
