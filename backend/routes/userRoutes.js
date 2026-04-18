const express = require('express');
const { registerUser } = require('../controllers/complaintController');

const router = express.Router();

router.post('/', registerUser);

module.exports = router;
