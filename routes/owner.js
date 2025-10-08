const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/ownerController");
const propertyController = require("../controllers/propertyController");

router.get("/owner_dashboard", ownerController.getOwnerDashboard);
router.post(
  "/maintenance-request/status",
  ownerController.updateMaintenanceRequestStatus
);


router.delete("/owner/delete-account", ownerController.deleteOwnerAccount);

router.post("/owner/update-settings", ownerController.updateOwnerSettings);


module.exports = router;
