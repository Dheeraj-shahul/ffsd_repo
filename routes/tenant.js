const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const isAuthenticated = require('../middleware/auth');
const Notification = require('../models/notification');

router.get('/api/notifications', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.userType !== 'tenant') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const notifications = await Notification.find({ 
      recipient: req.session.user._id,
      recipientType: 'Tenant'
    })
      .sort({ createdAt: -1 })
      .populate('worker', 'firstName lastName')
      .populate('bookingId', 'serviceType')
      .lean();
    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      recipientName: notification.recipientName,
      workerName: notification.workerName,
      propertyName: notification.propertyName,
      status: notification.status,
      priority: notification.priority,
      createdDate: notification.createdDate ? new Date(notification.createdDate).toLocaleString() : notification.createdAt.toLocaleString(),
      read: notification.read,
      serviceType: notification.bookingId?.serviceType || 'N/A'
    }));
    res.status(200).json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', {
      message: error.message,
      stack: error.stack,
      userId: req.session.user?._id
    });
    res.status(500).json({ error: 'Server error' });
  }
});

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

// Save/Remove Property
router.post('/saved-property', isAuthenticated, (req, res, next) => {
  console.log('Reached /saved-property route:', { method: req.method, body: req.body, session: req.session.user });
  tenantController.toggleSavedProperty(req, res, next);
});


// Notification preferences update
router.post('/notifications', isAuthenticated, tenantController.updateNotificationPreferences);

module.exports = router;