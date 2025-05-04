const mongoose = require('mongoose');

// Import models (adjust paths if your folder structure is different)
const MaintenanceRequest = require('./models/MaintenanceRequest');
const Complaint = require('./models/complaint');
const Payment = require('./models/payment');
const Rating = require('./models/rating');
const RentalHistory = require('./models/rentalhistory');

// Mock ObjectIds for references
const tenantId = new mongoose.Types.ObjectId();
const propertyId = new mongoose.Types.ObjectId();
const ownerId = new mongoose.Types.ObjectId();
const workerId = new mongoose.Types.ObjectId();

// Mock data for each collection
const maintenanceRequests = [
  {
    tenantId,
    propertyId,
    issueType: 'Plumbing',
    description: 'Leaky faucet in bathroom',
    location: 'Master Bathroom',
    dateReported: new Date('2025-04-01'),
    scheduledDate: new Date('2025-04-05'),
    status: 'Pending',
    assignedTo: 'John Smith',
  },
  {
    tenantId,
    propertyId,
    issueType: 'Electrical',
    description: 'Faulty light switch in kitchen',
    location: 'Kitchen',
    dateReported: new Date('2025-04-02'),
    scheduledDate: new Date('2025-04-06'),
    status: 'In Progress',
    assignedTo: 'Jane Doe',
  },
];

const complaints = [
  {
    tenantId,
    propertyId,
    category: 'Noise',
    subject: 'Loud neighbors',
    description: 'Upstairs neighbors making noise late at night',
    dateSubmitted: new Date('2025-03-25'),
    status: 'Open',
  },
  {
    tenantId,
    propertyId,
    category: 'Maintenance',
    subject: 'Slow maintenance response',
    description: 'Maintenance requests taking too long to resolve',
    dateSubmitted: new Date('2025-03-28'),
    status: 'In Progress',
    response: 'We are working on improving our response times',
    responseDate: new Date('2025-03-30'),
  },
];

const payments = [
  {
    tenantId,
    propertyId,
    amount: 1500,
    paymentDate: new Date('2025-04-01'),
    dueDate: new Date('2025-04-01'),
    paymentMethod: 'Credit Card',
    status: 'Paid',
    receiptUrl: 'https://example.com/receipts/123.pdf',
  },
  {
    tenantId,
    propertyId,
    amount: 1500,
    dueDate: new Date('2025-05-01'),
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
  },
];

const ratings = [
  {
    tenantId,
    propertyId,
    ownerId,
    workerId,
    rating: 4,
    review: 'Great service, quick response time',
    date: new Date('2025-03-20'),
  },
  {
    tenantId,
    propertyId,
    ownerId,
    workerId,
    rating: 3,
    review: 'Satisfactory work but could improve communication',
    date: new Date('2025-03-25'),
  },
];

const rentalHistories = [
  {
    tenantId,
    propertyIds: [
      {
        property: propertyId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        rent: 1500,
        owner: 'Acme Properties',
        address: '123 Main St, City',
        status: 'Completed',
        reasonForMoving: 'Job relocation',
      },
      {
        property: propertyId,
        startDate: new Date('2025-01-01'),
        rent: 1600,
        owner: 'Acme Properties',
        address: '123 Main St, City',
        status: 'Current',
      },
    ],
  },
];

// Seed function
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/rentease', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing collections
    await MaintenanceRequest.deleteMany({});
    await Complaint.deleteMany({});
    await Payment.deleteMany({});
    await Rating.deleteMany({});
    await RentalHistory.deleteMany({});

    // Insert mock data
    await MaintenanceRequest.insertMany(maintenanceRequests);
    console.log('Maintenance Requests seeded');

    await Complaint.insertMany(complaints);
    console.log('Complaints seeded');

    await Payment.insertMany(payments);
    console.log('Payments seeded');

    await Rating.insertMany(ratings);
    console.log('Ratings seeded');

    await RentalHistory.insertMany(rentalHistories);
    console.log('Rental Histories seeded');

    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedDatabase();