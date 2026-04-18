const express = require('express');
const ivrController = require('../controllers/ivrController');

const router = express.Router();

router.get('/health', ivrController.health);
router.post('/voice', ivrController.voicePrompt);
router.post('/handle-key', ivrController.handleKey);
router.post('/save-recording', ivrController.saveRecording);
router.get('/complaints', ivrController.listIvrComplaints);
router.post('/complaints/:id/retry-transcription', ivrController.retryTranscription);

module.exports = router;