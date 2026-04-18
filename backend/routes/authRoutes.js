const express = require('express');
const {
	signup,
	login,
	requestPasswordResetOtp,
	resetPasswordWithOtp
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password/request-otp', requestPasswordResetOtp);
router.post('/forgot-password/reset-password', resetPasswordWithOtp);

module.exports = router;
