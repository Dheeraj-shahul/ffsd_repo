const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const isAuthenticated = require("../middleware/auth");

// Debug: Log the imported controller
console.log('tenantController:', Object.keys(tenantController));

// Dashboard route
router.get('/tenant_dashboard', isAuthenticated, tenantController.getDashboard);

// Maintenance routes
router.post('/maintenance/submit', isAuthenticated, tenantController.submitMaintenanceRequest);

// Complaint routes
router.post('/complaint/submit', isAuthenticated, tenantController.submitComplaint);

// Review routes
router.post('/review/submit', isAuthenticated, tenantController.submitPropertyReview);

// Profile routes
router.post('/profile/update', isAuthenticated, tenantController.updateProfile);
router.post('/profile/change-password', isAuthenticated, tenantController.changePassword);

// Saved properties routes
router.post('/property/toggle-save', isAuthenticated, tenantController.toggleSavedProperty);

module.exports = router;