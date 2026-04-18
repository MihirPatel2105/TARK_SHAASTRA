const express = require('express');
const complaintController = require('../controllers/complaintController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/nearby', complaintController.getNearbyComplaints);
router.get('/map', complaintController.getNearbyComplaints);
router.get('/mine', protect, complaintController.getMyComplaints);
router.get('/needs-location', complaintController.getNeedsLocationComplaints);
router.get('/analytics', complaintController.analytics);
router.get('/:id', complaintController.getComplaintById);
router.post('/', protect, upload.single('image'), complaintController.createComplaint);
router.post('/ivr', protect, complaintController.createIvrComplaint);
router.post('/:id/vote', complaintController.voteOnComplaint);
router.post('/:id/trigger-location-ivr', complaintController.triggerLocationFollowupIvr);
router.post('/:id/ivr/location', complaintController.ingestIvrLocationUpdate);
router.post('/:id/ivr/response', complaintController.ingestIvrVerificationResponse);
router.post('/:id/resolve', upload.single('image'), complaintController.resolveComplaint);

module.exports = router;
