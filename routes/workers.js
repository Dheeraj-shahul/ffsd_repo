const express = require("express");
const router = express.Router();
const workerController = require("../controllers/workerController");

// Route to render the worker registration page
router.get("/worker_register", workerController.isAuthenticated, workerController.renderWorkerRegisterPage);

// Route to render the worker details page
router.get("/workerDetails", workerController.renderWorkerDetailsPage);

// API endpoint to get all workers data
router.get("/api/workers", workerController.getAllWorkers);

// API endpoint to get a specific worker by ID
router.get("/api/workers/:id", workerController.getWorkerById);

// Add filter functionality for workers
router.get("/api/workers/filter", workerController.filterWorkers);

// API endpoint to register a new worker
router.post("/api/workers/register", workerController.registerWorker);

module.exports = router;