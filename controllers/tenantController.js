const Tenant = require('../models/tenant');
const Property = require('../models/property');
const Worker = require('../models/worker');
const Owner = require('../models/owner');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Complaint = require('../models/complaint');
const Payment = require('../models/payment');
const Rating = require('../models/rating');
const RentalHistory = require('../models/rentalhistory');
const mongoose = require('mongoose');

// Dashboard Controller
exports.getDashboard = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to dashboard, redirecting to login");
      return res.redirect('/login?error=Please log in');
    }
    const userId = req.session.user._id;
    console.log("Fetching dashboard for tenant ID:", userId);

    const tenant = await Tenant.findById(userId)
      .populate('savedListings')
      .populate({ path: 'maintenanceRequestIds', model: 'MaintenanceRequest', options: { sort: { 'dateReported': -1 } } })
      .populate({ path: 'complaintIds', model: 'Complaint', options: { sort: { 'dateSubmitted': -1 } } })
      .populate('domesticWorkerId');

    if (!tenant) {
      console.log("Tenant not found for ID:", userId);
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const currentProperty = await Property.findOne({ tenantId: userId });

    let propertyOwner = null;
    if (currentProperty && currentProperty.ownerId) {
      propertyOwner = await Owner.findById(currentProperty.ownerId);
    }

    const payments = await Payment.find({ tenantId: userId })
      .sort({ paymentDate: -1 })
      .limit(10);

    const nextPayment = await Payment.findOne({ 
      tenantId: userId, 
      status: 'Pending' 
    }).sort({ dueDate: 1 });

    const activeMaintenanceRequests = await MaintenanceRequest.find({
      tenantId: userId,
      status: { $in: ['Pending', 'In Progress'] }
    }).sort({ dateReported: -1 });

    const completedMaintenanceRequests = await MaintenanceRequest.find({
      tenantId: userId,
      status: 'Completed'
    }).sort({ dateReported: -1 }).limit(5);

    const complaints = await Complaint.find({ tenantId: userId })
      .sort({ dateSubmitted: -1 });

    const workers = await Worker.find({ clientIds: userId });

    const rentalHistory = await RentalHistory.findOne({ tenantId: userId });

    const ratings = await Rating.find({ 
      tenantId: userId,
      propertyId: { $exists: true }
    }).populate('propertyId');

    res.render('pages/tenant_dashboard', {
      user: tenant,
      currentProperty,
      propertyOwner,
      payments,
      nextPayment,
      activeMaintenanceRequests,
      completedMaintenanceRequests,
      complaints,
      workers,
      rentalHistory: rentalHistory ? rentalHistory.propertyIds : [],
      ratings
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Maintenance Request Controller
exports.submitMaintenanceRequest = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to maintenance request");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const { issueType, description, location, preferredDate } = req.body;
    const tenantId = req.session.user._id;
    console.log("Submitting maintenance request for tenant ID:", tenantId, { issueType, description, location, preferredDate });

    const property = await Property.findOne({ tenantId });
    if (!property) {
      console.log("No property found for tenant ID:", tenantId);
      return res.status(404).json({ success: false, message: 'No property found for this tenant' });
    }

    const newRequest = new MaintenanceRequest({
      tenantId,
      propertyId: property._id,
      issueType,
      description,
      location,
      scheduledDate: preferredDate ? new Date(preferredDate) : null,
      status: 'Pending'
    });

    await newRequest.save();

    await Tenant.findByIdAndUpdate(tenantId, {
      $push: { maintenanceRequestIds: newRequest._id }
    });

    await Owner.findByIdAndUpdate(property.ownerId, {
      $push: { maintenanceRequestIds: newRequest._id }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Maintenance request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Maintenance request error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Complaint Controller
exports.submitComplaint = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to complaint submission");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const { category, subject, description } = req.body;
    const tenantId = req.session.user._id;
    console.log("Submitting complaint for tenant ID:", tenantId, { category, subject, description });

    const property = await Property.findOne({ tenantId });
    if (!property) {
      console.log("No property found for tenant ID:", tenantId);
      return res.status(404).json({ success: false, message: 'No property found for this tenant' });
    }

    const newComplaint = new Complaint({
      tenantId,
      propertyId: property._id,
      category,
      subject,
      description,
      status: 'Open'
    });

    await newComplaint.save();

    await Tenant.findByIdAndUpdate(tenantId, {
      $push: { complaintIds: newComplaint._id }
    });

    await Owner.findByIdAndUpdate(property.ownerId, {
      $push: { complaintIds: newComplaint._id }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Complaint submitted successfully',
      complaint: newComplaint
    });
  } catch (error) {
    console.error('Complaint submission error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Property Reviews Controller
exports.submitPropertyReview = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to review submission");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const { propertyId, rating, review } = req.body;
    const tenantId = req.session.user._id;
    console.log("Submitting review for tenant ID:", tenantId, { propertyId, rating, review });

    const property = await Property.findById(propertyId);
    if (!property) {
      console.log("Property not found:", propertyId);
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const existingRating = await Rating.findOne({ 
      tenantId, 
      propertyId 
    });

    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
      existingRating.date = new Date();
      await existingRating.save();

      return res.status(200).json({ 
        success: true, 
        message: 'Review updated successfully',
        rating: existingRating
      });
    }

    const newRating = new Rating({
      tenantId,
      propertyId,
      ownerId: property.ownerId,
      rating,
      review
    });

    await newRating.save();

    await Tenant.findByIdAndUpdate(tenantId, {
      $push: { ratingIds: newRating._id }
    });

    const propertyRatings = await Rating.find({ propertyId });
    const averageRating = propertyRatings.reduce((acc, curr) => acc + curr.rating, 0) / propertyRatings.length;

    await Property.findByIdAndUpdate(propertyId, {
      rating: averageRating,
      reviews: propertyRatings.length
    });

    res.status(201).json({ 
      success: true, 
      message: 'Review submitted successfully',
      rating: newRating
    });
  } catch (error) {
    console.error('Rating submission error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Update Profile Controller
exports.updateProfile = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to profile update");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const { firstName, lastName, email, phone, location } = req.body;
    const tenantId = req.session.user._id;
    console.log("Received profile update request for tenant ID:", tenantId, { firstName, lastName, email, phone, location });

    // Validate inputs
    if (!firstName || !lastName || !email) {
      console.log("Validation failed: Missing required fields");
      return res.status(400).json({ success: false, message: 'First name, last name, and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("Validation failed: Invalid email format");
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Check email uniqueness
    const existingTenant = await Tenant.findOne({ email, _id: { $ne: tenantId } });
    if (existingTenant) {
      console.log("Email already in use:", email);
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Prepare update object
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (location) updateFields.location = location;

    console.log("Updating tenant with fields:", updateFields);
    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedTenant) {
      console.log("Tenant not found for ID:", tenantId);
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Update session
    req.session.user = {
      ...req.session.user,
      firstName: updatedTenant.firstName,
      lastName: updatedTenant.lastName,
      email: updatedTenant.email,
      phone: updatedTenant.phone,
      location: updatedTenant.location
    };

    console.log("Profile updated successfully for tenant ID:", tenantId, updatedTenant);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        firstName: updatedTenant.firstName,
        lastName: updatedTenant.lastName,
        email: updatedTenant.email,
        phone: updatedTenant.phone || '',
        location: updatedTenant.location || ''
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Change Password Controller
exports.changePassword = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to password change");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const { currentPassword, newPassword } = req.body;
    const tenantId = req.session.user._id;
    console.log("Received password change request for tenant ID:", tenantId, { currentPassword, newPassword });

    // Validate inputs
    if (!currentPassword || !newPassword) {
      console.log("Validation failed: Missing required fields");
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      console.log("Validation failed: Password too short");
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      console.log("Tenant not found for ID:", tenantId);
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Verify current password (plain text)
    if (tenant.password !== currentPassword) {
      console.log("Incorrect current password for tenant ID:", tenantId);
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    tenant.password = newPassword;
    await tenant.save();

    console.log("Password changed successfully for tenant ID:", tenantId);
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Update Notification Preferences Controller
exports.updateNotificationPreferences = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to notification preferences");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    const { emailNotifications, smsNotifications, rentReminders, maintenanceUpdates, newListings } = req.body;
    const tenantId = req.session.user._id;
    console.log("Received notification preferences update for tenant ID:", tenantId, {
      emailNotifications,
      smsNotifications,
      rentReminders,
      maintenanceUpdates,
      newListings
    });

    // Prepare update object
    const updateFields = {};
    if (emailNotifications !== undefined) updateFields.emailNotifications = emailNotifications === true || emailNotifications === 'true';
    if (smsNotifications !== undefined) updateFields.smsNotifications = smsNotifications === true || smsNotifications === 'true';
    if (rentReminders !== undefined) updateFields.rentReminders = rentReminders === true || rentReminders === 'true';
    if (maintenanceUpdates !== undefined) updateFields.maintenanceUpdates = maintenanceUpdates === true || maintenanceUpdates === 'true';
    if (newListings !== undefined) updateFields.newListings = newListings === true || newListings === 'true';

    console.log("Updating tenant notification preferences with fields:", updateFields);
    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedTenant) {
      console.log("Tenant not found for ID:", tenantId);
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Update session
    req.session.user = {
      ...req.session.user,
      emailNotifications: updatedTenant.emailNotifications,
      smsNotifications: updatedTenant.smsNotifications,
      rentReminders: updatedTenant.rentReminders,
      maintenanceUpdates: updatedTenant.maintenanceUpdates,
      newListings: updatedTenant.newListings
    };

    console.log("Notification preferences updated successfully for tenant ID:", tenantId, updatedTenant);
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      user: {
        emailNotifications: updatedTenant.emailNotifications,
        smsNotifications: updatedTenant.smsNotifications,
        rentReminders: updatedTenant.rentReminders,
        maintenanceUpdates: updatedTenant.maintenanceUpdates,
        newListings: updatedTenant.newListings
      }
    });
  } catch (error) {
    console.error('Notification preferences update error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Save/Remove Property Controller
exports.toggleSavedProperty = async (req, res) => {
  try {
    console.log('Received /saved-property request:', { body: req.body, sessionUser: req.session.user });
    if (!req.session.user || !req.session.user._id) {
      console.log("Unauthorized access to saved property, no session user");
      return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    if (req.session.user.userType !== 'tenant') {
      console.log("Non-tenant user attempted to save property, user ID:", req.session.user._id, "userType:", req.session.user.userType);
      return res.status(403).json({ success: false, message: 'Only tenants can save properties' });
    }

    const { propertyId, action } = req.body;
    const tenantId = req.session.user._id;
    console.log("Processing toggle saved property for tenant ID:", tenantId, { propertyId, action });

    // Validate inputs
    if (!propertyId) {
      console.log("Missing property ID");
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      console.log("Invalid property ID format:", propertyId);
      return res.status(400).json({ success: false, message: 'Invalid property ID' });
    }
    if (!['save', 'remove'].includes(action)) {
      console.log("Invalid action:", action);
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      console.log("Property not found for ID:", propertyId);
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check if tenant exists
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      console.log("Tenant not found for ID:", tenantId);
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (action === 'save') {
      if (tenant.savedListings.includes(propertyId)) {
        console.log("Property already saved:", propertyId);
        return res.status(400).json({ success: false, message: 'Property already saved' });
      }

      await Tenant.findByIdAndUpdate(tenantId, {
        $push: { savedListings: propertyId }
      });

      const updatedTenant = await Tenant.findById(tenantId);
      console.log("Property saved successfully for tenant ID:", tenantId, "Property ID:", propertyId);
      return res.status(200).json({ 
        success: true, 
        message: 'Property saved successfully',
        savedCount: updatedTenant.savedListings.length
      });
    } else if (action === 'remove') {
      await Tenant.findByIdAndUpdate(tenantId, {
        $pull: { savedListings: propertyId }
      });

      const updatedTenant = await Tenant.findById(tenantId);
      console.log("Property removed successfully for tenant ID:", tenantId, "Property ID:", propertyId);
      return res.status(200).json({ 
        success: true, 
        message: 'Property removed from saved listings',
        savedCount: updatedTenant.savedListings.length
      });
    }
  } catch (error) {
    console.error('Saved property error for tenant ID:', req.session.user?._id, 'Property ID:', req.body.propertyId, error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error: Unable to save property' });
  }
};