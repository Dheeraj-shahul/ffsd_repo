// controllers/analyticsController.js
const Payment = require('../models/payment');
const User = require('../models/user');
const Booking = require('../models/booking');
const Property = require('../models/property');

exports.getAnalytics = async (req, res) => {
  try {
    // Current year calculations
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);
    
    // 1. Monthly Revenue
    const monthlyRevenue = await Promise.all(months.map(async (month) => {
      const start = new Date(currentYear, month, 1);
      const end = new Date(currentYear, month + 1, 0);
      const result = await Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: start, $lte: end },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      return result.length > 0 ? result[0].total : 0;
    }));

    // 2. User Growth
    const userGrowth = await Promise.all(months.map(async (month) => {
      const start = new Date(currentYear, month, 1);
      const end = new Date(currentYear, month + 1, 0);
      const count = await User.countDocuments({
        createdAt: { $gte: start, $lte: end }
      });
      return count;
    }));

    // 3. Booking Status Distribution
    const bookingStatusDistribution = {
      pending: await Booking.countDocuments({ status: 'pending' }),
      confirmed: await Booking.countDocuments({ status: 'confirmed' }),
      cancelled: await Booking.countDocuments({ status: 'cancelled' }),
      completed: await Booking.countDocuments({ status: 'completed' })
    };

    // 4. Top Performing Properties
    const topProperties = await Booking.aggregate([
      {
        $group: {
          _id: '$propertyId',
          bookings: { $sum: 1 }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'property'
        }
      },
      { $unwind: '$property' },
      {
        $project: {
          name: '$property.name',
          bookings: 1
        }
      }
    ]);

    // 5. Revenue by Source
    const revenueBySource = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Convert to object format
    const revenueSources = {
      rentals: revenueBySource.find(r => r._id === 'rent')?.total || 0,
      services: revenueBySource.find(r => r._id === 'service')?.total || 0,
      maintenance: revenueBySource.find(r => r._id === 'maintenance')?.total || 0,
      other: revenueBySource.find(r => r._id === 'other')?.total || 0
    };

    // 6. Occupancy Rate (simplified)
    const occupancyRate = await Promise.all(months.map(async (month) => {
      // This is a simplified calculation - adjust based on your business logic
      const propertyCount = await Property.countDocuments();
      if (propertyCount === 0) return 0;
      
      const start = new Date(currentYear, month, 1);
      const end = new Date(currentYear, month + 1, 0);
      
      const activeBookings = await Booking.countDocuments({
        startDate: { $lte: end },
        endDate: { $gte: start },
        status: { $in: ['confirmed', 'completed'] }
      });
      
      return Math.round((activeBookings / propertyCount) * 100);
    }));

    res.json({
      monthlyRevenue,
      userGrowth,
      bookingStatusDistribution,
      topProperties,
      revenueBySource: revenueSources,
      occupancyRate
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
};