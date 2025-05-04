module.exports = [
  {
    id: 1,
    userType: "worker",
    firstName: "Priya",
    lastName: "Singh",
    email: "priya.singh@example.com",
    phone: "9876543210",
    location: "delhi",
    area: "karol bagh",
    serviceType: "Cooking",
    experience: 5,
    password: "password123",
    availability: true,
    status: "Active",
    price: 8000,
    description: "Experienced cook specializing in North Indian cuisine.",
    image: "https://media.istockphoto.com/id/1449552590/photo/portrait-of-indian-woman-enjoying-while-cooking-meal-in-the-kitchen-stock-photo.jpg?s=612x612&w=0&k=20&c=sSSFGWffGnjDJEX_VCA3YQ5B3T1jQ_0kCbPTL0BItlg=",
    ratingId: {
      average: 4.8,
      reviews: [
        { user: "Rahul M.", rating: 5, date: "2024-01-15", comment: "Amazing food and very professional." },
        { user: "Anjali K.", rating: 4.5, date: "2024-01-10", comment: "Great with meal planning and variety." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 2,
    userType: "worker",
    firstName: "Rajesh",
    lastName: "Kumar",
    email: "rajesh.kumar@example.com",
    phone: "9876543211",
    location: "mumbai",
    area: "bandra",
    serviceType: "Cleaning",
    experience: 8,
    password: "password123",
    availability: true,
    status: "Active",
    price: 12000,
    description: "Professional cleaner with expertise in deep cleaning.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcRWrUwZFj0nlGLQzEZXtwsYih-cOoSSSxXrNYayPnvfL5S0d5b_jnIKA3L8pdeo4vbeSNs&usqp=CAU",
    ratingId: {
      average: 4.5,
      reviews: [
        { user: "Sneha P.", rating: 4.5, date: "2024-01-12", comment: "Very thorough and punctual." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 3,
    userType: "worker",
    firstName: "Meera",
    lastName: "Patel",
    email: "meera.patel@example.com",
    phone: "9876543212",
    location: "delhi",
    area: "dwarka",
    serviceType: "Child Care",
    experience: 4,
    password: "password123",
    availability: true,
    status: "Active",
    price: 9000,
    description: "Dedicated child care provider with a nurturing approach.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcQj0XfxMbdcZq_xITpjFKmsmrtlIiLXjOpHWg&s",
    ratingId: {
      average: 4.6,
      reviews: [
        { user: "Amit S.", rating: 4.5, date: "2024-01-18", comment: "Great with kids and very reliable." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 4,
    userType: "worker",
    firstName: "Suresh",
    lastName: "Iyer",
    email: "suresh.iyer@example.com",
    phone: "9876543213",
    location: "mumbai",
    area: "andheri",
    serviceType: "Gardening",
    experience: 10,
    password: "password123",
    availability: true,
    status: "Active",
    price: 15000,
    description: "Expert gardener specializing in landscaping and plant care.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcStJ66qMv2mblO0jsaWdItEd9XfbZWvnqlGAQ&s",
    ratingId: {
      average: 4.9,
      reviews: [
        { user: "Priya R.", rating: 5, date: "2024-01-20", comment: "Transformed my garden beautifully!" }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 5,
    userType: "worker",
    firstName: "Anita",
    lastName: "Desai",
    email: "anita.desai@example.com",
    phone: "9876543214",
    location: "bangalore",
    area: "koramangala",
    serviceType: "Laundry",
    experience: 3,
    password: "password123",
    availability: true,
    status: "Active",
    price: 7000,
    description: "Professional laundry service with attention to detail.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcQ305w-rKlUVKrufMk-B9h8JT3R1MAWoq7c1A&s",
    ratingId: {
      average: 4.7,
      reviews: [
        { user: "Ravi K.", rating: 4.5, date: "2024-01-22", comment: "Excellent service and very reliable." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 6,
    userType: "worker",
    firstName: "Ramesh",
    lastName: "Kumar",
    email: "ramesh.kumar@example.com",
    phone: "9876543215",
    location: "chennai",
    area: "t nagar",
    serviceType: "Cleaning",
    experience: 6,
    password: "password123",
    availability: true,
    status: "Active",
    price: 10000,
    description: "Professional cleaner with expertise in office cleaning.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcQmKlJWvsGOafAMr0EC1nVYN0DUmVM4h2qPcg&s",
    ratingId: {
      average: 4.3,
      reviews: [
        { user: "Karthik S.", rating: 4.5, date: "2024-01-25", comment: "Very efficient and reliable." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 7,
    userType: "worker",
    firstName: "Sunita",
    lastName: "Sharma",
    email: "sunita.sharma@example.com",
    phone: "9876543216",
    location: "hyderabad",
    area: "hitech city",
    serviceType: "Child Care",
    experience: 7,
    password: "password123",
    availability: true,
    status: "Active",
    price: 11000,
    description: "Experienced child care provider with a focus on early education.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcR1w8vwRSEllrM9GBr4D4cpT2jiwaBjQ73OCg&s",
    ratingId: {
      average: 4.7,
      reviews: [
        { user: "Priya R.", rating: 4.7, date: "2024-01-28", comment: "Great with kids and very caring." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 8,
    userType: "worker",
    firstName: "Vijay",
    lastName: "Reddy",
    email: "vijay.reddy@example.com",
    phone: "9876543217",
    location: "kolkata",
    area: "salt lake",
    serviceType: "Gardening",
    experience: 9,
    password: "password123",
    availability: true,
    status: "Active",
    price: 13000,
    description: "Expert gardener with a passion for organic gardening.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:TcTK-OyiBlfVJnc4gHbnJEKOSpNflsz8tO9pNA&s",
    ratingId: {
      average: 4.8,
      reviews: [
        { user: "Rahul M.", rating: 4.8, date: "2024-01-30", comment: "Transformed my garden into a paradise!" }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  },
  {
    id: 9,
    userType: "worker",
    firstName: "Anjali",
    lastName: "Gupta",
    email: "anjali.gupta@example.com",
    phone: "9876543218",
    location: "pune",
    area: "koregaon park",
    serviceType: "Laundry",
    experience: 5,
    password: "password123",
    availability: true,
    status: "Active",
    price: 9000,
    description: "Professional laundry service with expertise in delicate fabrics.",
    image: "https://www.shutterstock.com/image-photo/indian-woman-doing-laundry-260nw-796939462.jpg",
    ratingId: {
      average: 4.6,
      reviews: [
        { user: "Sneha P.", rating: 4.6, date: "2024-02-01", comment: "Excellent service and very reliable." }
      ]
    },
    serviceId: null,
    bookingIds: [],
    clientIds: [],
    paymentId: null
  }
];