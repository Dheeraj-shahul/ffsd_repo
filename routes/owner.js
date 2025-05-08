const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/ownerController");

router.get("/owner_dashboard", ownerController.getOwnerDashboard);
router.post(
  "/maintenance-request/status",
  ownerController.updateMaintenanceRequestStatus
);

const propertyController = require("../controllers/propertyController");

module.exports = router;
