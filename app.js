// app.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Import database connection
const connectDB = require("./connectDB/connectDB.js");

// Import routes
const authRoutes = require("./routes/authRoutes.js");
const blogRoutes = require("./routes/blogRoutes.js");

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

app.set("trust proxy", 1);
// Security middleware
app.use(helmet());


const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,   // your deployed frontend (Vercel/Netlify/etc.)
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Blog API Server", 
    version: "1.0.0",
    status: "running",
    database: "connected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/blogs", blogRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Route not found" 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Something went wrong!",
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
