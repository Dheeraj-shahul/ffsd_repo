const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const isAuthenticated = require('../middleware/auth');

// Debug log for tenant routes
router.use((req, res, next) => {
  console.log(`Tenant route: ${req.method} ${req.url}`);
  next();
});

// Tenant dashboard route
router.get('/tenant_dashboard', isAuthenticated, tenantController.getDashboard);

// Maintenance request submission
router.post('/maintenance', isAuthenticated, tenantController.submitMaintenanceRequest);

// Complaint submission
router.post('/complaint', isAuthenticated, tenantController.submitComplaint);

// Property review submission
router.post('/review', isAuthenticated, tenantController.submitPropertyReview);

// Profile update
router.post('/profile', isAuthenticated, tenantController.updateProfile);

// Password change
router.post('/password', isAuthenticated, tenantController.changePassword);

// Save or remove property
router.post('/saved-property', isAuthenticated, tenantController.toggleSavedProperty);

// Notification preferences update
router.post('/notifications', isAuthenticated, tenantController.updateNotificationPreferences);

module.exports = router;