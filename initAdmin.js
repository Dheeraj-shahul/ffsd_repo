const mongoose = require("mongoose");
const Admin = require("./models/admin");

async function initAdmin() {
  try {
    await mongoose.connect(
      "mongodb+srv://revanthkumardompaka:qqo8F9xCiY5DPQLT@ffsd.pjcw0o6.mongodb.net/rentease",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to MongoDB");

    const admin = await Admin.findOne({ username: "admin" });
    if (!admin) {
      await Admin.create({ username: "admin", password: "123" });
      console.log("Admin user created: username=admin, password=123");
    } else {
      console.log("Admin user already exists");
    }

    mongoose.disconnect();
  } catch (err) {
    console.error("Error initializing admin:", err);
    mongoose.disconnect();
  }
}

initAdmin();
