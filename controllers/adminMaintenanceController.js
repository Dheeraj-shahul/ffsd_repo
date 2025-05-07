const MaintenanceRequest = require('../models/MaintenanceRequest');
const Property = require('../models/property');
const Tenant = require('../models/tenant');
const Owner = require('../models/owner');

exports.getMaintenanceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await MaintenanceRequest.findById(id)
      .populate('propertyId', 'name location address')
      .populate('tenantId', 'firstName lastName email phone')
      .populate('assignedWorkerId', 'firstName lastName serviceType');
    
    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }
    
    // Get owner details
    const property = await Property.findById(request.propertyId)
      .populate('ownerId', 'firstName lastName email phone');
    
    res.render('admin/maintenance-view', { 
      request,
      owner: property.ownerId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.completeMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    
    await MaintenanceRequest.findByIdAndUpdate(
      id,
      { 
        status: 'Completed',
        completionDate: new Date() 
      }
    );
    
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};