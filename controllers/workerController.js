const Worker = require("../models/worker");
const formidable = require("formidable");
const fs = require("fs");

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  // Redirect to login page with return URL
  res.redirect("/login?returnTo=/worker_register");
};

// Redirect to appropriate dashboard based on user type
const redirectToDashboard = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login?returnTo=/worker_register");
  }
  const { userType } = req.session.user;
  switch (userType) {
    case "owner":
      return res.redirect("/owner_dashboard");
    case "tenant":
      return res.redirect("/tenant_dashboard");
    case "worker":
      return res.redirect("/worker_dashboard");
    default:
      return res.redirect("/");
  }
};

// Render the worker registration page
exports.renderWorkerRegisterPage = async (req, res) => {
  try {
    if (req.session.user.userType !== "worker") {
      return redirectToDashboard(req, res);
    }
    res.render("pages/worker_register");
  } catch (error) {
    console.error("Error rendering worker registration page:", error);
    res.status(500).send("Error loading worker registration page");
  }
};

// Render the worker details page
exports.renderWorkerDetailsPage = async (req, res) => {
  try {
    res.render("pages/workerDetails");
  } catch (error) {
    console.error("Error rendering worker details page:", error);
    res.status(500).send("Error loading worker details page");
  }
};

// Get all workers as JSON for API
exports.getAllWorkers = async (req, res) => {
  try {
    // Check if there are any query parameters for filtering
    const { location, area, serviceType, price, rating } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (location) filter.location = location;
    if (area) filter.area = area;
    if (serviceType) filter.serviceType = serviceType;
    
    // Handle price range filtering
    if (price) {
      const [min, max] = price.split('-');
      if (min && max) {
        filter.price = { $gte: parseInt(min), $lte: parseInt(max) };
      } else if (min && min.includes('+')) {
        filter.price = { $gte: parseInt(min.replace('+', '')) };
      }
    }
    
    // Handle rating filtering
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
    const { location, area, serviceType, price, rating } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (location) filter.location = location;
    if (area) filter.area = area;
    if (serviceType) filter.serviceType = serviceType;
    
    // Handle price range filtering
    if (price) {
      const [min, max] = price.split('-');
      if (min && max) {
        filter.price = { $gte: parseInt(min), $lte: parseInt(max) };
      } else if (min && min.includes('+')) {
        filter.price = { $gte: parseInt(min.replace('+', '')) };
      }
    }
    
    // Handle rating filtering
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

// Register a new worker
exports.registerWorker = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Error processing form data" });
    }

    try {
      // Extract and process fields
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
      const price = fields["expected-salary"] ? parseInt(fields["expected-salary"][0]) : 0;
      const description = fields["skills"] ? fields["skills"][0] : "";
      const availability = fields["availability"] ? fields["availability"][0] === "full-time" : true;

      // Validate required fields
      if (!fullName || !phone || !city || !area || !serviceType || !description || !price) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      // Handle photo upload
      let imageBase64 = "";
      if (files["photo"] && files["photo"][0]) {
        const photo = files["photo"][0];
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(photo.mimetype)) {
          return res.status(400).json({ error: "Photo must be an image (JPEG, PNG, or GIF)" });
        }
        const photoData = fs.readFileSync(photo.filepath);
        imageBase64 = `data:${photo.mimetype};base64,${photoData.toString("base64")}`;
      } else {
        return res.status(400).json({ error: "Photo is required" });
      }

      // Generate unique ID based on count
      const workerCount = await Worker.countDocuments();
      const newId = workerCount + 1;

      // Create new worker
      const newWorker = new Worker({
        id: newId,
        userType: "worker",
        firstName,
        lastName,
        email: email || undefined,
        phone,
        location: city,
        area,
        serviceType,
        experience,
        price,
        description,
        image: imageBase64,
        availability,
        status: "Active",
        lastLogin: new Date(),
      });

      // Save to database
      await newWorker.save();

      res.json({ success: true, message: "Worker registered successfully" });
    } catch (error) {
      console.error("Error registering worker:", error);
      res.status(500).json({ error: "Error registering worker" });
    }
  });
};