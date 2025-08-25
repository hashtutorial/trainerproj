const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting - FIXED: Removed trailing slash
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection - IMPROVED error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trainerlocator';
    
    await mongoose.connect(mongoURI, {
      // These options help with connection stability
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Don't exit process immediately - let the app run without DB for now
    console.log('⚠️  Server will continue without database connection');
    console.log('💡 To fix: Start MongoDB locally or use MongoDB Atlas');
    console.log('💡 For development: You can use the fallback data endpoints');
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Add fallback data endpoints when database is not available
app.get('/api/trainers/fallback', (req, res) => {
  console.log('📋 Serving fallback trainers data');
  
  const fallbackTrainers = [
    {
      _id: 'fallback-1',
      name: 'Mike Johnson',
      specialization: 'Weight Training',
      location: { city: 'New York, NY' },
      rating: { average: 4.9, count: 127 },
      experience: { years: 8, description: 'Certified bodybuilding coach' },
      services: [{ name: 'Personal Training', price: 85, duration: 60 }],
      clients: { total: 150, active: 45 },
      isVerified: true,
      featured: true,
      tags: ['Strength Training', 'Bodybuilding', 'Weight Loss']
    },
    {
      _id: 'fallback-2',
      name: 'Sarah Williams',
      specialization: 'Yoga & Flexibility',
      location: { city: 'Los Angeles, CA' },
      rating: { average: 4.8, count: 89 },
      experience: { years: 6, description: 'Yoga instructor specializing in mindfulness' },
      services: [{ name: 'Yoga Session', price: 70, duration: 60 }],
      clients: { total: 200, active: 60 },
      isVerified: true,
      featured: false,
      tags: ['Yoga', 'Pilates', 'Flexibility', 'Mindfulness']
    },
    {
      _id: 'fallback-3',
      name: 'David Chen',
      specialization: 'CrossFit',
      location: { city: 'Chicago, IL' },
      rating: { average: 4.9, count: 156 },
      experience: { years: 10, description: 'High-intensity training specialist' },
      services: [{ name: 'CrossFit Training', price: 90, duration: 60 }],
      clients: { total: 120, active: 35 },
      isVerified: true,
      featured: true,
      tags: ['CrossFit', 'HIIT', 'Strength', 'Functional Fitness']
    },
    {
      _id: 'fallback-4',
      name: 'Emma Davis',
      specialization: 'Cardio & Weight Loss',
      location: { city: 'Miami, FL' },
      rating: { average: 4.7, count: 203 },
      experience: { years: 5, description: 'Nutrition and fitness coach' },
      services: [{ name: 'Cardio Training', price: 75, duration: 60 }],
      clients: { total: 180, active: 55 },
      isVerified: true,
      featured: false,
      tags: ['Cardio', 'Weight Loss', 'Nutrition', 'Fitness']
    },
    {
      _id: 'fallback-5',
      name: 'Alex Rodriguez',
      specialization: 'Bodybuilding',
      location: { city: 'Austin, TX' },
      rating: { average: 5.0, count: 94 },
      experience: { years: 12, description: 'Powerlifting champion and coach' },
      services: [{ name: 'Bodybuilding Training', price: 95, duration: 60 }],
      clients: { total: 90, active: 25 },
      isVerified: true,
      featured: true,
      tags: ['Bodybuilding', 'Powerlifting', 'Strength', 'Competition Prep']
    },
    {
      _id: 'fallback-6',
      name: 'Lisa Thompson',
      specialization: 'Pilates',
      location: { city: 'Seattle, WA' },
      rating: { average: 4.8, count: 160 },
      experience: { years: 7, description: 'Pilates instructor and wellness coach' },
      services: [{ name: 'Pilates Session', price: 80, duration: 60 }],
      clients: { total: 160, active: 40 },
      isVerified: true,
      featured: false,
      tags: ['Pilates', 'Core Strength', 'Posture', 'Wellness']
    }
  ];

  res.json({
    success: true,
    trainers: fallbackTrainers,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalTrainers: fallbackTrainers.length,
      hasNext: false,
      hasPrev: false
    },
    message: 'Fallback data - MongoDB not available'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/trainers', require('./routes/trainers'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'OK',
    message: 'TRAINERLOCATOR Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling - FIXED potential route conflicts
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Join room based on user type
  socket.on('join_room', (data) => {
    if (data && data.room) {
      socket.join(data.room);
      console.log(`👤 User ${socket.id} joined room: ${data.room}`);
    }
  });

  // Handle trainer location updates
  socket.on('trainer_location_update', (data) => {
    if (data) {
      socket.to('users').emit('trainer_location_updated', data);
    }
  });

  // Handle session requests
  socket.on('session_request', (data) => {
    if (data && data.trainerId) {
      socket.to(`trainer_${data.trainerId}`).emit('new_session_request', data);
    }
  });

  // Handle session responses
  socket.on('session_response', (data) => {
    if (data && data.userId) {
      socket.to(`user_${data.userId}`).emit('session_response_received', data);
    }
  });

  // Handle live session updates
  socket.on('session_started', (data) => {
    if (data && data.sessionId) {
      socket.to(`session_${data.sessionId}`).emit('session_started', data);
    }
  });

  socket.on('session_ended', (data) => {
    if (data && data.sessionId) {
      socket.to(`session_${data.sessionId}`).emit('session_ended', data);
    }
  });

  // Handle AI feedback during sessions
  socket.on('ai_feedback', (data) => {
    if (data && data.sessionId) {
      socket.to(`session_${data.sessionId}`).emit('ai_feedback_received', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// 404 handler - FIXED: Use proper route pattern
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 TRAINERLOCATOR Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access server at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close();
  });
});

module.exports = { app, server, io };