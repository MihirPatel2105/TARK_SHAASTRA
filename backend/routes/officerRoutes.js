const express = require('express');
const complaintController = require('../controllers/complaintController');
const upload = require('../middleware/upload');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorizeRoles('officer', 'admin'));
router.get('/complaints', complaintController.getOfficerComplaints);
router.get('/complaints/needs-location', complaintController.getNeedsLocationComplaints);
router.post('/complaints/:id/start', complaintController.startComplaintWork);
router.post('/complaints/:id/trigger-location-ivr', complaintController.triggerLocationFollowupIvr);
router.post('/complaints/:id/resolve', upload.single('image'), complaintController.resolveOfficerComplaint);

module.exports = router;
