const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');

router.get('/owner_dashboard', ownerController.getOwnerDashboard);

module.exports = router;