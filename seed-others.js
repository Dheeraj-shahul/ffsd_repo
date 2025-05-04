// D:\RentEase\seed-others.js
const mongoose = require("mongoose");
const Booking = require("./models/booking");
const Payment = require("./models/payment");
const Notification = require("./models/notification");
const Setting = require("./models/setting");

mongoose.connect("mongodb://127.0.0.1:27017/rentease")
  .then(async () => {
    console.log("Connected to MongoDB");
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});
    await Setting.deleteMany({});

    await Booking.insertMany([
      { id: "B1", user: "Alice", property: "Beach Villa", status: "Active" },
      { id: "B2", user: "Bob", property: "City Loft", status: "Pending" },
      { id: "B3", user: "Alice", property: "Beach Villa", status: "Cancelled" },
    ]);

    await Payment.insertMany([
      { id: "T1", user: "Alice", amount: 500.00, status: "Completed" },
      { id: "T2", user: "Bob", amount: 300.00, status: "Pending" },
    ]);

    await Notification.insertMany([
      { id: "N1", type: "Property", message: "New property submitted" },
      { id: "N2", type: "Booking", message: "New booking request" },
    ]);

    await Setting.insertMany([
      { id: "S1", name: "Website Title", value: "RentEase" },
      { id: "S2", name: "Payment Gateway", value: "Stripe" },
    ]);

    console.log("Other data imported successfully");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.connection.close();
  });