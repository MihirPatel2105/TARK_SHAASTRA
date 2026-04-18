const express = require('express');
const complaintController = require('../controllers/complaintController');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/nearby', complaintController.getNearbyComplaints);
router.get('/map', complaintController.getNearbyComplaints);
router.get('/analytics', complaintController.analytics);
router.get('/:id', complaintController.getComplaintById);
router.post('/', upload.single('image'), complaintController.createComplaint);
router.post('/:id/vote', complaintController.voteOnComplaint);
router.post('/:id/resolve', upload.single('image'), complaintController.resolveComplaint);

module.exports = router;
