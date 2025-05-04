// D:\RentEase\seed-users.js
const mongoose = require("mongoose");
const Tenant = require("./models/tenant");
const Worker = require("./models/worker");
const Owner = require("./models/owner");
const users = require("./users");

mongoose.connect("mongodb://127.0.0.1:27017/rentease")
  .then(async () => {
    console.log("Connected to MongoDB");

    // Clear collections
    await Tenant.deleteMany({});
    await Worker.deleteMany({});
    await Owner.deleteMany({});

    // Separate users by userType
    const tenants = users.filter(u => u.userType === "tenant");
    const workers = users.filter(u => u.userType === "worker");
    const owners = users.filter(u => u.userType === "owner");

    // Insert into respective collections
    if (tenants.length) await Tenant.insertMany(tenants);
    if (workers.length) await Worker.insertMany(workers);
    if (owners.length) await Owner.insertMany(owners);

    console.log("Users imported successfully");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.connection.close();
  });