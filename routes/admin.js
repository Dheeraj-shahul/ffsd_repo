const express = require('express');
const router = express.Router();
const adminPropertyController = require('../controllers/adminPropertyController');
const adminUserController = require('../controllers/adminUserController');
const adminBookingController = require('../controllers/adminBookingController');
const adminNotificationController = require('../controllers/adminNotificationController');
const adminMaintenanceController = require('../controllers/adminMaintenanceController');

// View routes
router.get('/user/:id/:userType', adminUserController.getUserDetails);
router.get('/booking/:id', adminBookingController.getBookingDetails);
router.get('/notification/:id', adminNotificationController.getNotificationDetails);
router.get('/maintenance/:id', adminMaintenanceController.getMaintenanceDetails);

// Action routes
// Property Management
router.post('/property/verify/:id', adminPropertyController.toggleVerify);
router.delete('/property/delete/:id', adminPropertyController.deleteProperty);
router.get('/property-management', adminPropertyController.getPropertyManagement);
router.get('/property/:id', adminPropertyController.getPropertyView);

// User Management
router.post('/user/status/:id/:userType', adminUserController.changeUserStatus);
router.delete('/user/delete/:id/:userType', adminUserController.deleteUser);

// Booking Management
router.post('/booking/approve/:id', adminBookingController.approveBooking);
router.post('/booking/reject/:id', adminBookingController.rejectBooking);

// Notification Management
router.post('/notification/complete/:id', adminNotificationController.completeNotification);

// Maintenance Management
router.post('/maintenance/complete/:id', adminMaintenanceController.completeMaintenance);

module.exports = router;