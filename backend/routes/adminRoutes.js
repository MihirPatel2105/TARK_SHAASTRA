const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorizeRoles('admin'));
router.post('/officers', adminController.createOfficer);
router.get('/complaints', adminController.getAdminComplaints);
router.get('/complaints/overlay', adminController.getAdminOverlayPoints);
router.get('/complaints/:id', adminController.getAdminComplaintById);
router.post('/complaints/:id/verify', adminController.verifyAdminComplaint);
router.get('/dashboard', adminController.getAdminDashboard);
router.get('/report', adminController.exportAdminReport);
router.get('/dataset/info', adminController.getDatasetInfo);

module.exports = router;
