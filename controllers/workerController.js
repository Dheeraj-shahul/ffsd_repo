const mongoose = require("mongoose");
const Worker = require("../models/worker");
const Booking = require("../models/booking");
const Tenant = require("../models/tenant");
const Payment = require("../models/payment");
const WorkerPayment = require("../models/workerPayment");
const WorkerBooking = require("../models/workerBooking");
const Notification = require("../models/notification");
const formidable = require("formidable");
const fs = require("fs");
// bcrypt removed; plain-text password comparisons are used per requirement

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/login?returnTo=/workers/worker_dashboard");
};

// Redirect to appropriate dashboard based on user type
const redirectToDashboard = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login?returnTo=/workers/worker_dashboard");
  }
  const { userType } = req.session.user;
  switch (userType) {
    case "owner":
      return res.redirect("/owner_dashboard");
    case "tenant":
      return res.redirect("/tenant_dashboard");
    case "worker":
      return res.redirect("/workers/worker_dashboard");
    default:
      return res.redirect("/");
  }
};

// Render the worker dashboard
exports.renderWorkerDashboard = async (req, res) => {
  try {
    if (req.session.user.userType !== "worker") {
      return redirectToDashboard(req, res);
    }

    // Fetch fresh worker data from the database
    const worker = await Worker.findById(req.session.user._id);
    if (!worker) {
      return res.redirect("/login?error=Account%20not%20found");
    }

    // Convert to plain object and update session
    const user = worker.toObject();
    req.session.user = user;

    // Create services array with default values
    const services = user.serviceType
      ? [
          {
            name: user.serviceType || "Unknown Service",
            price: user.price || 0,
            rateUnit: user.rateUnit || "monthly",
            experience: user.experience || 0,
            serviceStatus: user.serviceStatus || "Available",
            image: user.image || "/images/default_service.jpg",
          },
        ]
      : [];

    // Fetch bookings
    const bookings = await Booking.find({ workerId: user._id });
    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      serviceName: booking.serviceName || user.serviceType || "N/A",
      clientName: booking.clientName || "N/A",
      date: booking.date ? new Date(booking.date).toLocaleDateString() : "N/A",
      status: booking.status || "Pending",
    }));

    // Fetch clients
    const clients = await Tenant.find({ _id: { $in: user.clientIds || [] } });
    const formattedClients = clients.map((client) => ({
      _id: client._id,
      name: `${client.firstName} ${client.lastName}`,
      serviceName: user.serviceType || "N/A",
      contact: client.phone || "N/A",
    }));

    // Fetch earnings and transactions from WorkerPayment model
    const payments = await WorkerPayment.find({
      workerId: new mongoose.Types.ObjectId(user._id),
    });
    const transactions = payments.map((payment) => ({
      title: "Worker Payment",
      serviceName: user.serviceType || "N/A",
      clientName: payment.userName || "N/A",
      date: payment.paymentDate
        ? new Date(payment.paymentDate).toLocaleDateString()
        : "N/A",
      amount: payment.amount || 0,
      status: payment.status || "Pending",
    }));
    const earnings = {
      monthly: payments.reduce(
        (sum, p) => (p.status === "Paid" ? sum + p.amount : sum),
        0
      ),
      pending: payments.reduce(
        (sum, p) => (p.status === "Pending" ? sum + p.amount : sum),
        0
      ),
    };

    // Fetch reviews
    const reviews = user.ratingId || { average: 0, reviews: [] };
    const formattedReviews = {
      averageRating: reviews.average || 0,
      count: reviews.reviews.length,
      items: reviews.reviews.map((review) => ({
        user: review.user || "Anonymous",
        rating: review.rating || 0,
        date: review.date ? new Date(review.date).toLocaleDateString() : "N/A",
        comment: review.comment || "No comment",
        serviceName: review.serviceName || user.serviceType || "N/A",
      })),
    };

    res.render("pages/worker_dashboard", {
      user,
      services,
      bookings: formattedBookings,
      clients: formattedClients,
      earnings,
      transactions,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Error rendering worker dashboard:", error);
    res.status(500).send("Error loading worker dashboard");
  }
};

// Render the worker registration page
exports.renderWorkerRegisterPage = async (req, res) => {
  try {
    if (req.session.user.userType !== "worker") {
      return redirectToDashboard(req, res);
    }
    const user = req.session.user;
    if (user.location) {
      const locationParts = user.location.split(",");
      user.city = locationParts[0] ? locationParts[0].trim().toLowerCase() : "";
      user.area =
        locationParts.length > 1
          ? locationParts[1].trim().toLowerCase()
          : user.area || "";
    }
    res.render("pages/worker_register", { user });
  } catch (error) {
    console.error("Error rendering worker registration page:", error);
    res.status(500).send("Error loading worker registration page");
  }
};

// Render the worker details page
exports.renderWorkerDetailsPage = async (req, res) => {
  try {
    const filter = {
      availability: { $in: ["full-time", "part-time", "weekends", true] },
      serviceStatus: "Available",
    };
    const workers = await Worker.find(filter);

    res.render("pages/workerDetails", {
      user: req.session.user || null,
      workers,
    });
  } catch (error) {
    console.error("Error rendering worker details page:", error);
    res.status(500).send("Error loading worker details page");
  }
};

// Render the service details page
exports.renderServiceDetailsPage = async (req, res) => {
  try {
    const workerId = req.params.id;
    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.redirect(
        "/workers/worker_dashboard?error=Worker%20not%20found"
      );
    }

    res.render("pages/service_details", {
      user: worker.toObject(),
      loggedInUser: req.session.user || null,
    });
  } catch (error) {
    console.error("Error rendering service details page:", error);
    res.redirect(
      "/workers/worker_dashboard?error=Error%20loading%20service%20details"
    );
  }
};

// Render the edit service page
exports.renderEditServicePage = async (req, res) => {
  try {
    if (req.session.user.userType !== "worker") {
      return redirectToDashboard(req, res);
    }

    const workerId = req.params.id;
    const worker = await Worker.findById(workerId);

    if (!worker || worker._id.toString() !== req.session.user._id) {
      return res.redirect(
        "/workers/worker_dashboard?error=Unauthorized%20access"
      );
    }

    const user = worker.toObject();
    if (user.location) {
      const locationParts = user.location.split(",");
      user.city = locationParts[0] ? locationParts[0].trim().toLowerCase() : "";
      user.area =
        locationParts.length > 1
          ? locationParts[1].trim().toLowerCase()
          : user.area || "";
    }

    res.render("pages/edit_service", { user });
  } catch (error) {
    console.error("Error rendering edit service page:", error);
    res.redirect(
      "/workers/worker_dashboard?error=Error%20loading%20edit%20service%20page"
    );
  }
};

// Register/Update worker details
exports.registerWorker = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Error processing form data" });
    }

    try {
      const fullName = fields["full-name"] ? fields["full-name"][0] : "";
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const phone = fields["phone"] ? fields["phone"][0] : "";
      const email = fields["email"] ? fields["email"][0] : "";
      const city = fields["city"] ? fields["city"][0] : "";
      const area = fields["area"] ? fields["area"][0] : "";
      const serviceType = fields["service-type"]
        ? fields["service-type"][0]
        : "";
      const experience = fields["experience"]
        ? parseInt(fields["experience"][0])
        : 0;
      const price = fields["price"] ? parseInt(fields["price"][0]) : 0;
      const description = fields["description"] ? fields["description"][0] : "";
      const availability = fields["availability"]
        ? fields["availability"][0]
        : null;
      const rateUnit = fields["rateUnit"] ? fields["rateUnit"][0] : "monthly";
      const termsAgreement = fields["terms-agreement"]
        ? fields["terms-agreement"][0] === "on"
        : false;

      if (
        !phone ||
        !email ||
        !city ||
        !area ||
        !serviceType ||
        !description ||
        !price ||
        !availability ||
        !termsAgreement
      ) {
        return res
          .status(400)
          .json({ error: "All required fields must be provided" });
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        return res
          .status(400)
          .json({ error: "Phone number must be a 10-digit number" });
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      if (experience < 0 || experience > 50) {
        return res
          .status(400)
          .json({ error: "Experience must be between 0 and 50 years" });
      }

      if (price < 1000) {
        return res.status(400).json({ error: "Rate must be at least ₹1000" });
      }

      if (!["full-time", "part-time", "weekends"].includes(availability)) {
        return res.status(400).json({ error: "Invalid availability" });
      }

      if (!["hourly", "daily", "monthly"].includes(rateUnit)) {
        return res.status(400).json({ error: "Invalid rate unit" });
      }

      let imageBase64 = null;
      if (files["image"] && files["image"][0]) {
        const image = files["image"][0];
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(image.mimetype)) {
          return res
            .status(400)
            .json({ error: "Image must be JPEG, PNG, or GIF" });
        }
        const imageData = fs.readFileSync(image.filepath);
        imageBase64 = `data:${image.mimetype};base64,${imageData.toString(
          "base64"
        )}`;
      }

      const worker = await Worker.findById(req.session.user._id);
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }

      worker.firstName = firstName;
      worker.lastName = lastName;
      worker.phone = phone;
      worker.email = email;
      worker.location = city;
      worker.area = area;
      worker.serviceType = serviceType;
      worker.experience = experience;
      worker.price = price;
      worker.rateUnit = rateUnit;
      worker.description = description;
      worker.availability = availability;
      worker.serviceStatus = availability ? "Available" : "Unavailable";
      if (imageBase64) {
        worker.image = imageBase64;
      }

      await worker.save();

      req.session.user = worker.toObject();

      res.json({
        success: true,
        message: "Worker profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating worker:", error);
      res.status(500).json({ error: "Error updating worker profile" });
    }
  });
};

// Get all workers as JSON for API
exports.getAllWorkers = async (req, res) => {
  try {
    const { location, area, serviceType, rating } = req.query;
    const filter = {
      availability: { $in: ["full-time", "part-time", "weekends"] },
      serviceStatus: "Available",
    };

    if (location) filter.location = new RegExp(location, "i");
    if (area) filter.area = new RegExp(area, "i");
    if (serviceType) filter.serviceType = serviceType;
    if (rating) {
      filter["ratingId.average"] = { $gte: parseInt(rating) };
    }

    // If the user is a logged-in tenant, exclude workers they have already booked
    if (req.session.user && req.session.user.userType === "tenant") {
      const tenant = await Tenant.findById(req.session.user._id).select("domesticWorkerId");
      if (tenant && tenant.domesticWorkerId && tenant.domesticWorkerId.length > 0) {
        filter._id = { $nin: tenant.domesticWorkerId }; // Exclude booked workers
      }
    }

    const workers = await Worker.find(filter);
    res.json(workers);
  } catch (error) {
    console.error("Error fetching workers:", error);
    res.status(500).json({ error: "Error fetching worker details" });
  }
};


// Get a single worker by ID
exports.getWorkerById = async (req, res) => {
  try {
    const workerId = req.params.id;
    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    res.json(worker);
  } catch (error) {
    console.error("Error fetching worker details:", error);
    res.status(500).json({ error: "Error fetching worker details" });
  }
};


// Filter workers based on multiple criteria
exports.filterWorkers = async (req, res) => {
  try {
    const { location, area, serviceType, rating } = req.query;
    const filter = {
      availability: { $in: ["full-time", "part-time", "weekends"] },
      serviceStatus: "Available",
    };

    if (location) filter.location = new RegExp(location, "i");
    if (area) filter.area = new RegExp(area, "i");
    if (serviceType) filter.serviceType = serviceType;
    if (rating) {
      filter["ratingId.average"] = { $gte: parseInt(rating) };
    }

    // If the user is a logged-in tenant, exclude workers they have already booked
    if (req.session.user && req.session.user.userType === "tenant") {
      const tenant = await Tenant.findById(req.session.user._id).select("domesticWorkerId");
      if (tenant && tenant.domesticWorkerId && tenant.domesticWorkerId.length > 0) {
        filter._id = { $nin: tenant.domesticWorkerId }; // Exclude booked workers
      }
    }

    const workers = await Worker.find(filter);
    res.json(workers);
  } catch (error) {
    console.error("Error filtering workers:", error);
    res.status(500).json({ error: "Error filtering workers" });
  }
};

// Toggle worker service availability
exports.toggleWorkerAvailability = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker || worker._id.toString() !== req.session.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    worker.serviceStatus =
      worker.serviceStatus === "Available" ? "Unavailable" : "Available";
    await worker.save();
    req.session.user = worker.toObject();
    res.json({ success: true, serviceStatus: worker.serviceStatus });
  } catch (error) {
    console.error("Error toggling worker availability:", error);
    res.status(500).json({ error: "Error toggling worker availability" });
  }
};

// Delete worker service details
exports.deleteWorkerService = async (req, res) => {
  try {
    const worker = await Worker.findById(req.session.user._id);
    if (!worker || worker._id.toString() !== req.session.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Remove service-related fields
    worker.serviceType = null;
    worker.experience = null;
    worker.price = null;
    worker.rateUnit = null;
    worker.description = null;
    worker.availability = null;
    worker.serviceStatus = "Unavailable";
    worker.image = null;

    await worker.save();
    req.session.user = worker.toObject();

    res.json({
      success: true,
      message: "Service details deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting worker service:", error);
    res.status(500).json({ error: "Error deleting worker service" });
  }
};

// Check if worker is booked
exports.checkWorkerBookedStatus = async (req, res) => {
  try {
    const workerId = req.params.id;
    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    if (worker._id.toString() !== req.session.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({ isBooked: worker.isBooked });
  } catch (error) {
    console.error("Error checking worker booked status:", error);
    res.status(500).json({ error: "Error checking booked status" });
  }
};

// Delete worker account
exports.deleteWorkerAccount = async (req, res) => {
  try {
    const workerId = req.params.id;
    const { password } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    if (worker._id.toString() !== req.session.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (worker.isBooked) {
      return res
        .status(400)
        .json({ error: "Cannot delete account: You are currently working" });
    }

    // Plain-text password comparison per request
    if (worker.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Delete the worker
    await Worker.deleteOne({ _id: workerId });

    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
    });

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting worker account:", error);
    res.status(500).json({ error: "Error deleting account" });
  }
};

exports.bookWorkerCorrected = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.userType !== "tenant") {
      console.log("Unauthorized: No user session or not a tenant", {
        user: req.session.user,
      });
      return res
        .status(401)
        .json({ error: "Unauthorized: Please log in as a tenant" });
    }

    const workerId = req.params.id;
    const tenantId = req.session.user._id;
    const { serviceType } = req.body;

    if (!serviceType) {
      console.log("Missing serviceType in request body", { body: req.body });
      return res.status(400).json({ error: "Service type is required" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      console.log("Worker not found", { workerId });
      return res.status(404).json({ error: "Worker not found" });
    }

    if (worker.serviceStatus !== "Available") {
      console.log("Worker not available", {
        workerId,
        serviceStatus: worker.serviceStatus,
      });
      return res.status(400).json({ error: "Worker is not available" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      console.log("Tenant not found", { tenantId });
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Ensure the worker is not already in the tenant's domesticWorkerId array
    if (tenant.domesticWorkerId.includes(workerId)) {
      console.log("Worker already booked by tenant", { workerId, tenantId });
      return res.status(400).json({ error: "Worker already booked" });
    }

    const newBooking = new WorkerBooking({
      tenantId,
      workerId,
      serviceType,
      status: "Pending",
      tenantName: `${tenant.firstName} ${tenant.lastName}`,
      tenantAddress: tenant.location || "Not provided",
      bookingDate: new Date(),
    });

    await newBooking.save();
    console.log("New booking created", { bookingId: newBooking._id });

    // Optionally, update domesticWorkerId here if booking is immediately approved
    // For now, this is handled in updateWorkerBookingStatus when status is set to "Approved"

    return res
      .status(200)
      .json({ success: true, message: "Booking request sent successfully" });
  } catch (error) {
    console.error("Error booking worker:", {
      message: error.message,
      stack: error.stack,
      workerId: req.params.id,
      tenantId: req.session.user?._id,
      serviceType: req.body.serviceType,
    });
    return res.status(500).json({ error: "Server error while booking worker" });
  }
};
// This function should be added to the same file where updateWorkerBookingStatus exists
// or imported from a notification service file

/**
 * Sends a notification to a tenant by creating a notification record
 * @param {ObjectId} tenantId - The ID of the tenant receiving the notification
 * @param {Object} data - Data for the notification
 * @param {string} data.message - The notification message
 * @param {ObjectId} data.bookingId - The related booking ID
 * @param {ObjectId} data.workerId - The worker ID who triggered the notification
 * @param {string} data.serviceType - The service type related to the booking
 */
const sendNotificationToTenant = async (tenantId, data) => {
  try {
    // Get worker details for the notification
    const worker = await Worker.findById(data.workerId);

    if (!worker) {
      console.error(
        "Worker not found when sending notification:",
        data.workerId
      );
      return;
    }

    // Create new notification object
    const notification = new Notification({
      type: "Booking Update",
      message: data.message,
      recipient: tenantId,
      recipientType: "Tenant",
      worker: data.workerId,
      workerName: `${worker.firstName} ${worker.lastName}`,
      status: data.status === "Approved" ? "Approved" : "Rejected",
      priority: "Medium",
      createdDate: new Date(),
      bookingId: data.bookingId,
      read: false,
    });

    // Save the notification to the database
    const savedNotification = await notification.save();

    console.log("Notification created successfully:", {
      notificationId: savedNotification._id.toString(),
      tenantId: tenantId.toString(),
      message: data.message,
    });

    // Update the tenant's notificationIds array (optional but recommended for quick access)
    await Tenant.findByIdAndUpdate(
      tenantId,
      { $push: { notificationIds: savedNotification._id } },
      { new: true }
    );

    return savedNotification;
  } catch (error) {
    console.error("Error sending notification to tenant:", {
      tenantId: tenantId.toString(),
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - just log the error since this is a secondary operation
  }
};

exports.getWorkerBookings = async (req, res) => {
  try {
    const workerId = req.session.user._id;
    const bookings = await WorkerBooking.find({ workerId })
      .populate("tenantId", "firstName lastName location")
      .populate("workerId", "serviceType");
    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      serviceName: booking.serviceType || "N/A",
      tenantId: {
        firstName: booking.tenantId.firstName || "N/A",
        lastName: booking.tenantId.lastName || "",
      },
      propertyId: {
        address: booking.tenantAddress || "N/A",
      },
      date: booking.bookingDate
        ? new Date(booking.bookingDate).toLocaleDateString()
        : "N/A",
      time: booking.bookingDate
        ? new Date(booking.bookingDate).toLocaleTimeString()
        : "N/A",
      status: booking.status || "Pending",
    }));
    return res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Error fetching worker bookings:", error);
    return res.status(500).json([]);
  }
};

exports.updateWorkerBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;
    const workerId = req.session.user._id;

    // Debug logging to trace the issue
    console.log("Starting updateWorkerBookingStatus with params:", {
      bookingId,
      workerId: workerId.toString(),
      status,
    });

    // Make sure we're using proper ObjectId for MongoDB queries
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      console.error("Invalid booking ID format:", bookingId);
      return res.status(400).json({ error: "Invalid booking ID format" });
    }

    // Use findOneAndUpdate to ensure atomic update operation
    const updatedBooking = await WorkerBooking.findOneAndUpdate(
      { _id: bookingId, workerId: workerId },
      { status: status },
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      console.error("Booking not found or worker not authorized:", {
        bookingId,
        workerId: workerId.toString(),
      });
      return res
        .status(404)
        .json({ error: "Booking not found or not authorized to update" });
    }

    console.log("Booking status updated successfully:", {
      bookingId: updatedBooking._id.toString(),
      newStatus: updatedBooking.status,
    });

    // Handle approval-specific logic
    // Handle notification for Approved or Declined status
    if (status === "Approved" || status === "Declined") {
      try {
        // Find tenant and worker
        const tenant = await Tenant.findById(updatedBooking.tenantId);
        const worker = await Worker.findById(workerId);

        if (!tenant || !worker) {
          console.error("Tenant or worker not found for notification:", {
            tenantId: updatedBooking.tenantId.toString(),
            workerId: workerId.toString(),
          });
          return res.status(404).json({ error: "Tenant or worker not found" });
        }

        // Only update associations for Approved status
        if (status === "Approved") {
          // Ensure arrays are initialized
          tenant.domesticWorkerId = Array.isArray(tenant.domesticWorkerId)
            ? tenant.domesticWorkerId
            : [];
          worker.clientIds = Array.isArray(worker.clientIds)
            ? worker.clientIds
            : [];

          // Add worker to tenant's domesticWorkerId array if not already present
          const workerIdStr = workerId.toString();
          if (
            !tenant.domesticWorkerId.some((id) => id.toString() === workerIdStr)
          ) {
            tenant.domesticWorkerId.push(workerId);
            await tenant.save();
            console.log("Updated tenant with worker association:", {
              tenantId: tenant._id.toString(),
              addedWorkerId: workerIdStr,
            });
          }

          // Add tenant to worker's clientIds array if not already present
          const tenantIdStr = tenant._id.toString();
          if (!worker.clientIds.some((id) => id.toString() === tenantIdStr)) {
            worker.clientIds.push(tenant._id);
            worker.isBooked = true;
            await worker.save();
            console.log("Updated worker with tenant association:", {
              workerId: worker._id.toString(),
              addedTenantId: tenantIdStr,
            });
          }

          // Update session with fresh worker data
          req.session.user = worker.toObject();
        }

        // Send notification to tenant
        const message =
          status === "Approved"
            ? `Your booking for ${updatedBooking.serviceType} has been approved by ${worker.firstName} ${worker.lastName}.`
            : `Your booking for ${updatedBooking.serviceType} has been declined by ${worker.firstName} ${worker.lastName}.`;
        await sendNotificationToTenant(updatedBooking.tenantId, {
          message,
          bookingId: updatedBooking._id,
          workerId,
          serviceType: updatedBooking.serviceType,
        });
      } catch (innerError) {
        console.error(
          status === "Approved"
            ? "Error updating associations or sending notification after approval:"
            : "Error sending notification for declined status:",
          innerError
        );
        // Continue processing - don't fail the status update due to association/notification issues
      }
    }

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}!`,
      bookingId: updatedBooking._id,
    });
  } catch (error) {
    console.error("Error in updateWorkerBookingStatus:", {
      message: error.message,
      stack: error.stack,
      bookingId: req.params.id,
      workerId: req.session.user?._id?.toString() || "unknown",
    });
    res
      .status(500)
      .json({ error: "Server error while updating booking status" });
  }
};

exports.renderWorkerDashboardSafer = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.userType !== "worker") {
      console.log("Unauthorized: No user session or not a worker", {
        user: req.session.user,
      });
      return res.redirect("/login");
    }

    const worker = await Worker.findById(req.session.user._id);
    if (!worker) {
      console.log("Worker not found", { workerId: req.session.user._id });
      return res.redirect("/login?error=Account%20not%20found");
    }

    const user = worker.toObject();
    req.session.user = user;

    // Ensure clientIds is an array
    user.clientIds = Array.isArray(user.clientIds) ? user.clientIds : [];
    console.log("ClientIds normalized", {
      workerId: user._id,
      clientIds: user.clientIds,
    });

    const services = user.serviceType
      ? [
          {
            name: user.serviceType || "Unknown Service",
            price: user.price || 0,
            rateUnit: user.rateUnit || "monthly",
            experience: user.experience || 0,
            serviceStatus: user.serviceStatus || "Available",
            image: user.image || "/images/default_service.jpg",
          },
        ]
      : [];

    const bookings = await WorkerBooking.find({ workerId: user._id })
      .populate("tenantId", "firstName lastName")
      .lean();
    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      serviceName: booking.serviceType || user.serviceType || "N/A",
      tenantId: {
        firstName: booking.tenantId?.firstName || "N/A",
        lastName: booking.tenantId?.lastName || "",
      },
      propertyId: {
        address: booking.tenantAddress || "N/A",
      },
      date: booking.bookingDate
        ? new Date(booking.bookingDate).toLocaleDateString()
        : "N/A",
      time: booking.bookingDate
        ? new Date(booking.bookingDate).toLocaleTimeString()
        : "N/A",
      status: booking.status || "Pending",
    }));
    console.log("Bookings fetched", { bookingCount: bookings.length });

    // Fetch approved bookings to get tenant IDs
    const approvedBookings = await WorkerBooking.find({
      workerId: user._id,
      status: "Approved",
    }).select("tenantId");
    const tenantIdsFromBookings = approvedBookings
      .map((b) => b.tenantId)
      .filter((id) => id);

    console.log("Approved bookings details", {
      bookingIds: approvedBookings.map((b) => b._id.toString()),
      tenantIds: tenantIdsFromBookings.map((id) => id.toString()),
      statuses: approvedBookings.map((b) => b.status),
    });

    const clients = await Tenant.find({
      _id: { $in: [...(user.clientIds || []), ...tenantIdsFromBookings] },
    }).lean();

    const clientBookings = await WorkerBooking.find({
      workerId: user._id,
      tenantId: { $in: clients.map((c) => c._id) },
    })
      .select("tenantId serviceType")
      .lean();

    console.log("Client bookings updated", {
      clientBookingCount: clientBookings.length,
      tenantIds: clientBookings.map((b) => b.tenantId.toString()),
      services: clientBookings.map((b) => b.serviceType),
    });

    const formattedClients = clients.map((client) => {
      const tenantBookings = clientBookings.filter(
        (b) => b.tenantId && b.tenantId.toString() === client._id.toString()
      );
      const services = tenantBookings
        .map((b) => b.serviceType)
        .filter((s) => s) || [user.serviceType || "N/A"];
      const clientData = {
        _id: client._id,
        firstName: client.firstName || "N/A",
        lastName: client.lastName || "",
        phone: client.phone || "N/A",
        services,
      };
      console.log("Client formatted", {
        clientId: client._id,
        services: clientData.services,
      });
      return clientData;
    });

    // Fetch earnings and transactions from WorkerPayment model
    const payments = await WorkerPayment.find({
      workerId: new mongoose.Types.ObjectId(user._id),
    });
    const transactions = payments.map((payment) => ({
      title: "Worker Payment",
      serviceName: user.serviceType || "N/A",
      clientName: payment.userName || "N/A",
      date: payment.paymentDate
        ? new Date(payment.paymentDate).toLocaleDateString()
        : "N/A",
      amount: payment.amount || 0,
      status: payment.status || "Pending",
    }));
    const earnings = {
      monthly: payments.reduce(
        (sum, p) => (p.status === "Paid" ? sum + p.amount : sum),
        0
      ),
      pending: payments.reduce(
        (sum, p) => (p.status === "Pending" ? sum + p.amount : sum),
        0
      ),
    };

    const reviews = user.ratingId || { average: 0, reviews: [] };
    const formattedReviews = {
      averageRating: reviews.average || 0,
      count: reviews.reviews.length,
      items: reviews.reviews.map((review) => ({
        user: review.user || "Anonymous",
        rating: review.rating || 0,
        date: review.date ? new Date(review.date).toLocaleDateString() : "N/A",
        comment: review.comment || "No comment",
        serviceName: review.serviceName || user.serviceType || "N/A",
      })),
    };

    res.render("pages/worker_dashboard", {
      user,
      services,
      bookings: formattedBookings,
      clients: formattedClients,
      earnings,
      transactions,
      reviews: formattedReviews,
      successMessage: req.session.successMessage,
    });
    req.session.successMessage = null;
  } catch (error) {
    console.error("Error rendering worker dashboard:", {
      message: error.message,
      stack: error.stack,
      workerId: req.session.user?._id,
    });
    res.render("pages/error", { error: "Failed to load worker dashboard" });
  }
};

// Update worker settings
exports.updateWorkerSettings = async (req, res) => {
  try {
    const userId = req.session.user._id; // Get the logged-in user ID from session

    // Get the data from the request body
    const {
      firstName,
      lastName,
      email,
      phone,
      location,
      experience,
      availability,
      serviceType,
      currentPassword,
      newPassword,
    } = req.body;

    // Find the worker
    const worker = await Worker.findById(userId);

    if (!worker) {
      return res
        .status(404)
        .json({ success: false, error: "Worker not found" });
    }

    // Update basic fields
    worker.firstName = firstName;
    worker.lastName = lastName;
    worker.email = email;
    worker.phone = phone;
    worker.location = location;
    worker.experience = experience;
    worker.availability = availability;
    worker.serviceType = serviceType;

    // Handle password change if provided
    if (newPassword) {
      // Plain-text comparison
      if (currentPassword !== worker.password) {
        return res
          .status(400)
          .json({ success: false, error: "Current password is incorrect" });
      }
      worker.password = newPassword;
    }

    // Save the updated worker
    await worker.save();

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating worker settings:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password, userType } = req.body;
  let user;
  if (userType === "worker") {
    user = await Worker.findOne({ email }).select("+password");
  } else if (userType === "tenant") {
    user = await Tenant.findOne({ email }).select("+password");
  } else if (userType === "owner") {
    user = await Owner.findOne({ email }).select("+password");
  }
  if (!user) {
    return res.status(401).render("pages/login", { error: "Account not found" });
  }
  // Plain-text comparison
  if (user.password !== password) {
    return res.status(401).render("pages/login", { error: "Incorrect password" });
  }
  // ...set session and redirect...
};
