const Worker = require("../models/worker");
const Booking = require("../models/booking");
const Tenant = require("../models/tenant");
const Payment = require("../models/payment");
const formidable = require("formidable");
const fs = require("fs");

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

    // Fetch earnings and transactions
    const payments = await Payment.find({ _id: { $in: user.paymentId || [] } });
    const transactions = payments.map((payment) => ({
      title: payment.type === "weekly" ? "Weekly Contract" : "Recent Transaction",
      serviceName: payment.serviceName || user.serviceType || "N/A",
      clientName: payment.clientName || "N/A",
      date: payment.date ? new Date(payment.date).toLocaleDateString() : "N/A",
      period: payment.period || null,
      amount: payment.amount || 0,
      status: payment.status || "Pending",
    }));
    const earnings = {
      monthly: payments.reduce((sum, p) => (p.status === "Paid" ? sum + p.amount : sum), 0),
      pending: payments.reduce((sum, p) => (p.status === "Pending" ? sum + p.amount : sum), 0),
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
      user.area = locationParts.length > 1 ? locationParts[1].trim().toLowerCase() : user.area || "";
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
      availability: { $in: ["full-time", "part-time", "weekends",true] },
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
      return res.redirect("/workers/worker_dashboard?error=Worker%20not%20found");
    }

    res.render("pages/service_details", {
      user: worker.toObject(),
      loggedInUser: req.session.user || null,
    });
  } catch (error) {
    console.error("Error rendering service details page:", error);
    res.redirect("/workers/worker_dashboard?error=Error%20loading%20service%20details");
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
      return res.redirect("/workers/worker_dashboard?error=Unauthorized%20access");
    }

    const user = worker.toObject();
    if (user.location) {
      const locationParts = user.location.split(",");
      user.city = locationParts[0] ? locationParts[0].trim().toLowerCase() : "";
      user.area = locationParts.length > 1 ? locationParts[1].trim().toLowerCase() : user.area || "";
    }

    res.render("pages/edit_service", { user });
  } catch (error) {
    console.error("Error rendering edit service page:", error);
    res.redirect("/workers/worker_dashboard?error=Error%20loading%20edit%20service%20page");
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
      const serviceType = fields["service-type"] ? fields["service-type"][0] : "";
      const experience = fields["experience"] ? parseInt(fields["experience"][0]) : 0;
      const price = fields["price"] ? parseInt(fields["price"][0]) : 0;
      const description = fields["description"] ? fields["description"][0] : "";
      const availability = fields["availability"] ? fields["availability"][0] : null;
      const rateUnit = fields["rateUnit"] ? fields["rateUnit"][0] : "monthly";
      const termsAgreement = fields["terms-agreement"] ? fields["terms-agreement"][0] === "on" : false;

      if (!fullName || !phone || !email || !city || !area || !serviceType || !description || !price || !availability || !termsAgreement) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ error: "Phone number must be a 10-digit number" });
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      if (experience < 0 || experience > 50) {
        return res.status(400).json({ error: "Experience must be between 0 and 50 years" });
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
          return res.status(400).json({ error: "Image must be JPEG, PNG, or GIF" });
        }
        const imageData = fs.readFileSync(image.filepath);
        imageBase64 = `data:${image.mimetype};base64,${imageData.toString("base64")}`;
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

      res.json({ success: true, message: "Worker profile updated successfully" });
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
    worker.serviceStatus = worker.serviceStatus === "Available" ? "Unavailable" : "Available";
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

    res.json({ success: true, message: "Service details deleted successfully" });
  } catch (error) {
    console.error("Error deleting worker service:", error);
    res.status(500).json({ error: "Error deleting worker service" });
  }
};


// Get bookings
exports.getBookings = async (req, res) => {
  try {
    const workerId = req.session.user._id;
    const bookings = await Booking.find({
      assignedWorker: workerId,
    })
      .populate("tenantId", "firstName lastName")
      .populate("propertyId", "name address");

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;
    const workerId = req.session.user._id;

    const booking = await Booking.findOne({
      _id: bookingId,
      assignedWorker: workerId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = status;
    await booking.save();

    req.session.successMessage = `Booking status updated to ${status}!`;
    res.redirect("/worker/worker_dashboard");
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).send("Server error");
  }
};