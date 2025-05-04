const mongoose = require("mongoose");
const settingSchema = new mongoose.Schema({
  id: String,
  name: String,
  value: String,
});
module.exports = mongoose.model("Setting", settingSchema);