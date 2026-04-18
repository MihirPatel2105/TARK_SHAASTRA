const express = require('express');
const controller = require('../controllers/ivrController');
const validateTwilioSignature = require('../middleware/validateTwilioSignature');

const router = express.Router();

router.get('/health', controller.health);
router.post('/calls/trigger', controller.triggerCall);
router.post('/voice', validateTwilioSignature, controller.voicePrompt);
router.post('/handle-key', validateTwilioSignature, controller.handleKey);

module.exports = router;
