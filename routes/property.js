// routes/property.js
const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");

// Authentication middleware (reusing your isAuthenticated)
const isAuthenticated = require("../middleware/auth");

// Route for property listing form submission
router.post("/list-property", isAuthenticated, propertyController.listProperty);

router.delete('/:id', propertyController.deleteProperty);

module.exports = router;