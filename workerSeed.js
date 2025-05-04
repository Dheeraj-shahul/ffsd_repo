const mongoose = require("mongoose");
const Worker = require("./models/worker");
const workers = require("./workers");

mongoose.connect("mongodb://127.0.0.1:27017/rentease")
  .then(async () => {
    console.log("Connected to MongoDB");
    await Worker.deleteMany({});
    await Worker.insertMany(workers);
    console.log("Workers imported successfully");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.connection.close();
  });