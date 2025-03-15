const express = require('express');
const fs = require("fs");
const path = require('path');
const app = express();
const PORT = 3000;

// import data
const properties = require('./properties.js');
const initialUsers = require('./users.js');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
// Load initial users
const usersFilePath = path.join(__dirname, "users.js");

// In-memory user storage (will reset on restart)
let users = [...initialUsers];

// Helper function to save users to users.js
function saveUsers(updatedUsers) {
    fs.writeFileSync(usersFilePath, `// users.js – Temporary in-memory storage\n\nconst users = ${JSON.stringify(updatedUsers, null, 2)};\n\nmodule.exports = users;\n`);
}


// GET: Render Registration Page
app.get("/register", (req, res) => {
    res.render("pages/registration", { userType: "", serviceType: "" });
});


// Signup route
app.post("/register", (req, res) => {
    const {
        userType,
        firstName,
        lastName,
        email,
        phone,
        location,
        serviceType,
        experience,
        numProperties,
        password,
    } = req.body;

    const newUser = {
        id: users.length + 1,
        userType,
        firstName,
        lastName,
        email,
        phone,
        location,
        serviceType: userType === "worker" ? serviceType : null,
        experience: userType === "worker" ? Number(experience) || null : null,
        numProperties: userType === "homeowner" ? Number(numProperties) || null : null,
        password,
    };

    users.push(newUser);
    console.log("New User Registered:", newUser);
    
    // Save updated users list
    saveUsers(users);

    res.redirect("/login");
});

// GET: Render Login Page
app.get('/login', (req, res) => {
    res.render('pages/login', {
        userType: '',
        email: '',
        password: '',
        error: req.query.error || '',
        errors: {}
    });
});

// POST: Handle Login Logic
app.post('/login', (req, res) => {
    console.log('POST /login received:', req.body);
    const { userType, email, password } = req.body;
    const errors = {};

    // Basic validation
    if (!userType) errors.userType = 'Role is required';
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
        return res.render('pages/login', {
            userType,
            email,
            password: '',
            errors
        });
    }

    // Check against initialUsers
    const user = initialUsers.find(u => 
        u.email === email && 
        u.password === password && 
        u.userType === userType
    );

    if (!user) {
        console.log('No user found, setting auth error');
        errors.auth = 'Invalid email, password, or user type';
        console.log('Errors object before render:', errors); // Confirm errors object
        return res.render('pages/login', {
            userType,
            email,
            password: '',
            errors
        });
    }

    else
    {
        
         // Successful login - redirect based on user type
    console.log('Login successful, user ID:', user.id);
    if (user.userType === 'tenant') {
      res.redirect(`/tenant_dashboard?id=${user.id}`);
      
    } else if (user.userType === 'owner') {
      res.redirect(`/owner_dashboard?id=${user.id}`);
      
    } else if (user.userType === 'worker') {
      res.redirect(`/worker_dashboard?id=${user.id}`);
      
    }

   

    }

   

   
});


// Dashboard Routes (no session protection)
app.get('/tenant_dashboard', (req, res) => {
    const userId = req.query.id;
    const user = initialUsers.find(u => u.id == userId);
    if (!user || user.userType !== 'tenant') {
      return res.redirect('/login?error=Invalid user');
    }
    res.render('pages/tenant_dashboard', { user });
  });
  
  app.get('/owner_dashboard', (req, res) => {
    const userId = req.query.id;
    const user = initialUsers.find(u => u.id == userId);
    if (!user || user.userType !== 'owner') {
      return res.redirect('/login?error=Invalid user');
    }
    res.render('pages/owner_dashboard', { user });
  });
  
  app.get('/worker_dashboard', (req, res) => {
    const userId = req.query.id;
    const user = initialUsers.find(u => u.id == userId);
    if (!user || user.userType !== 'worker') {
      return res.redirect('/login?error=Invalid user');
    }
    res.render('pages/worker_dashboard', { user });
  });

// Route for the main page
app.get('/', (req, res) => {
    res.render('pages/index');
  });

app.get('/header', (req, res) => {
        res.render('partials/header');
});

// Route to render search.ejs
app.get('/search', (req, res) => {
    res.render('pages/search1' , {properties,request:req});  // Pass properties an
  });


// Route for property details
app.get('/property', (req, res) => {
    const propertyId = req.query.id; // Get id from query string (e.g., /property?id=12)
    const property = properties.find(p => p.id == propertyId); // Find matching property
  
    if (!property) {
      return res.status(404).send('Property not found');
    }
  
    res.render('pages/propertydetails', { property }); // Pass property to template
  });


  app.get('/property', (req, res) => {
  const propertyId = req.query.id;
  console.log('Requested ID:', propertyId);
  const property = properties.find(p => p.id == propertyId);
  console.log('Found Property:', property);
  if (!property) return res.status(404).send('Property not found');
  res.render('pages/propertydetails', { property });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});