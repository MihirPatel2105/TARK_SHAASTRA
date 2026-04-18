const mongoose = require('mongoose');
const User = require('../models/User');

async function protect(req, res, next) {
  const userId = req.header('x-user-id') || req.query.userId;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401);
    return next(new Error('Authentication required. Send a valid x-user-id header.'));
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
