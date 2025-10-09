const express = require('express');
const router = express.Router();
const contactUsController = require('../controllers/contactUsController');

// POST route to handle form submissions
router.post('/submit-form', contactUsController.submitForm);

// GET route to retrieve all contact submissions
router.get('/contact-submissions', contactUsController.getAllSubmissions);

module.exports = router;