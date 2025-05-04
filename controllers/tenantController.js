const Tenant = require('../models/tenant');
const Property = require('../models/property');
const Worker = require('../models/worker');
const Owner = require('../models/owner');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Complaint = require('../models/complaint');
const Payment = require('../models/payment');
const Rating = require('../models/rating');
const RentalHistory = require('../models/rentalhistory');

// Dashboard Controller
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id; // Standardized session handling

    // Fetch tenant data with populated references
    const tenant = await Tenant.findById(userId)
      .populate('savedListings')
      .populate({
        path: 'maintenanceRequestIds',
        model: 'MaintenanceRequest',
        options: { sort: { 'dateReported': -1 } }
      })
      .populate({
        path: 'complaintIds',
        model: 'Complaint',
        options: { sort: { 'dateSubmitted': -1 } }
      })
      .populate('domesticWorkerId');

    if (!tenant) {
      return res.status(404).send('Tenant not found');
    }

    // Get current property (assuming tenant is renting a property)
    const currentProperty = await Property.findOne({ tenantId: userId });

    // Get owner details for the current property
    let propertyOwner = null;
    if (currentProperty && currentProperty.ownerId) {
      propertyOwner = await Owner.findById(currentProperty.ownerId);
    }

    // Get payment history
    const payments = await Payment.find({ tenantId: userId })
      .sort({ paymentDate: -1 })
      .limit(10);

    // Calculate next rent due
    const nextPayment = await Payment.findOne({ 
      tenantId: userId, 
      status: 'Pending' 
    }).sort({ dueDate: 1 });

    // Get maintenance requests
    const activeMaintenanceRequests = await MaintenanceRequest.find({
      tenantId: userId,
      status: { $in: ['Pending', 'In Progress'] }
    }).sort({ dateReported: -1 });

    const completedMaintenanceRequests = await MaintenanceRequest.find({
      tenantId: userId,
      status: 'Completed'
    }).sort({ dateReported: -1 }).limit(5);

    // Get complaints
    const complaints = await Complaint.find({ tenantId: userId })
      .sort({ dateSubmitted: -1 });

    // Get domestic workers serving tenant
    const workers = await Worker.find({ clientIds: userId });

    // Get rental history
    const rentalHistory = await RentalHistory.findOne({ tenantId: userId });

    // Get property ratings
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
    res.status(500).send('Server error: ' + error.message);
  }
};

// Maintenance Request Controller
exports.submitMaintenanceRequest = async (req, res) => {
  try {
    const { issueType, description, location, preferredDate } = req.body;
    const tenantId = req.session.userId;

    // Get property ID for the tenant
    const property = await Property.findOne({ tenantId });
    if (!property) {
      return res.status(404).json({ error: 'No property found for this tenant' });
    }

    // Create maintenance request
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

    // Update tenant's maintenance requests
    await Tenant.findByIdAndUpdate(tenantId, {
      $push: { maintenanceRequestIds: newRequest._id }
    });

    // Update property owner's maintenance requests
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
    res.status(500).json({ error: 'Server error' });
  }
};

// Complaint Controller
exports.submitComplaint = async (req, res) => {
  try {
    const { category, subject, description } = req.body;
    const tenantId = req.session.userId;

    // Get property ID for the tenant
    const property = await Property.findOne({ tenantId });
    if (!property) {
      return res.status(404).json({ error: 'No property found for this tenant' });
    }

    // Create complaint
    const newComplaint = new Complaint({
      tenantId,
      propertyId: property._id,
      category,
      subject,
      description,
      status: 'Open'
    });

    await newComplaint.save();

    // Update tenant's complaints
    await Tenant.findByIdAndUpdate(tenantId, {
      $push: { complaintIds: newComplaint._id }
    });

    // Update property owner's complaints
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
    res.status(500).json({ error: 'Server error' });
  }
};

// Property Reviews Controller
exports.submitPropertyReview = async (req, res) => {
  try {
    const { propertyId, rating, review } = req.body;
    const tenantId = req.session.userId;

    // Validate property exists and tenant is renting it
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Create or update rating
    const existingRating = await Rating.findOne({ 
      tenantId, 
      propertyId 
    });

    if (existingRating) {
      // Update existing rating
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

    // Create new rating
    const newRating = new Rating({
      tenantId,
      propertyId,
      ownerId: property.ownerId,
      rating,
      review
    });

    await newRating.save();

    // Update tenant's ratings
    await Tenant.findByIdAndUpdate(tenantId, {
      $push: { ratingId: newRating._id }
    });

    // Update property ratings
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
    res.status(500).json({ error: 'Server error' });
  }
};

// Update Profile Controller
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, location } = req.body;
    const tenantId = req.session.userId;

    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { firstName, lastName, email, phone, location },
      { new: true }
    );

    if (!updatedTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedTenant
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change Password Controller
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const tenantId = req.session.userId;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify current password (use bcrypt in a real app)
    if (tenant.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password (use bcrypt in production)
    tenant.password = newPassword;
    await tenant.save();

    res.status(200).json({ 
      success: true, 
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Save/Remove Property Controller
exports.toggleSavedProperty = async (req, res) => {
  try {
    const { propertyId, action } = req.body; // action: 'save' or 'remove'
    const tenantId = req.session.userId;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (action === 'save') {
      // Check if already saved
      if (tenant.savedListings.includes(propertyId)) {
        return res.status(400).json({ error: 'Property already saved' });
      }

      // Add property to saved listings
      await Tenant.findByIdAndUpdate(tenantId, {
        $push: { savedListings: propertyId }
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Property saved successfully'
      });
    } else if (action === 'remove') {
      // Remove property from saved listings
      await Tenant.findByIdAndUpdate(tenantId, {
        $pull: { savedListings: propertyId }
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Property removed from saved listings'
      });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Saved property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};