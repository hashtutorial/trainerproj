const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const Session = require('../models/Session');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// Apply admin middleware to all routes
router.use(auth, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (admin only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const trainers = await User.countDocuments({ role: 'trainer', isActive: true });
    const regularUsers = await User.countDocuments({ role: 'user', isActive: true });
    const admins = await User.countDocuments({ role: 'admin', isActive: true });

    // Get users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Get session statistics
    const totalSessions = await Session.countDocuments();
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const scheduledSessions = await Session.countDocuments({ status: 'scheduled' });
    const cancelledSessions = await Session.countDocuments({ status: 'cancelled' });

    // Get booking statistics
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });

    // Get revenue statistics
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const monthlyRevenue = await Booking.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    // Get top performing trainers
    const topTrainers = await Trainer.aggregate([
      { $match: { isActive: true } },
      { $sort: { 'rating.average': -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          specialization: 1,
          rating: 1,
          clients: 1
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          trainers,
          regularUsers,
          admins,
          newUsers,
          inactiveUsers: totalUsers - activeUsers
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          scheduled: scheduledSessions,
          cancelled: cancelledSessions,
          completionRate: totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : 0
        },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings,
          completed: completedBookings
        },
        revenue: {
          total: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
          monthly: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0
        },
        topTrainers
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (admin only)
router.get('/users', async (req, res) => {
  try {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      count: users.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalUsers: total,
        hasNext: skip + users.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (admin only)
router.put('/users/:id/status', [
  body('isActive', 'isActive must be a boolean').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isActive } = req.body;

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (admin only)
router.put('/users/:id/role', [
  body('role', 'Role must be either user, trainer, or admin').isIn(['user', 'trainer', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { role } = req.body;

    // Prevent admin from changing their own role
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role'
    });
  }
});

// @route   GET /api/admin/trainers
// @desc    Get all trainers with verification status
// @access  Private (admin only)
router.get('/trainers', async (req, res) => {
  try {
    const {
      verified,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (verified !== undefined) {
      filter.isVerified = verified === 'true';
    }
    
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }

    const trainers = await Trainer.find(filter)
      .populate('userId', 'name email profileImage isActive')
      .sort({ createdAt: -1 });

    // Apply search filter after population
    let filteredTrainers = trainers;
    if (search) {
      filteredTrainers = trainers.filter(trainer => {
        const user = trainer.userId;
        return user.name.toLowerCase().includes(search.toLowerCase()) ||
               user.email.toLowerCase().includes(search.toLowerCase()) ||
               trainer.specialization.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Apply pagination
    const total = filteredTrainers.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTrainers = filteredTrainers.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      trainers: paginatedTrainers,
      count: paginatedTrainers.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTrainers: total,
        hasNext: skip + paginatedTrainers.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get admin trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainers'
    });
  }
});

// @route   PUT /api/admin/trainers/:id/verify
// @desc    Verify trainer profile
// @access  Private (admin only)
router.put('/trainers/:id/verify', [
  body('isVerified', 'isVerified must be a boolean').isBoolean(),
  body('notes', 'Verification notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isVerified, notes } = req.body;

    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    trainer.isVerified = isVerified;
    
    // Add verification history
    if (!trainer.verificationHistory) {
      trainer.verificationHistory = [];
    }
    
    trainer.verificationHistory.push({
      verified: isVerified,
      verifiedBy: req.user.id,
      timestamp: new Date(),
      notes
    });

    await trainer.save();

    res.json({
      success: true,
      message: `Trainer ${isVerified ? 'verified' : 'unverified'} successfully`,
      trainer: {
        id: trainer.id,
        isVerified: trainer.isVerified,
        verificationHistory: trainer.verificationHistory
      }
    });

  } catch (error) {
    console.error('Verify trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying trainer'
    });
  }
});

// @route   GET /api/admin/sessions
// @desc    Get all sessions with filters
// @access  Private (admin only)
router.get('/sessions', async (req, res) => {
  try {
    const {
      status,
      type,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const sessions = await Session.find(filter)
      .populate('userId', 'name email')
      .populate('trainerId', 'name email')
      .sort({ date: -1 });

    // Apply pagination
    const total = sessions.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedSessions = sessions.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      sessions: paginatedSessions,
      count: paginatedSessions.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalSessions: total,
        hasNext: skip + paginatedSessions.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sessions'
    });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings with filters
// @access  Private (admin only)
router.get('/bookings', async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      sessionType,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    
    if (sessionType) {
      filter.sessionType = sessionType;
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email')
      .populate('trainerId', 'name email')
      .sort({ createdAt: -1 });

    // Apply pagination
    const total = bookings.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedBookings = bookings.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      bookings: paginatedBookings,
      count: paginatedBookings.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBookings: total,
        hasNext: skip + paginatedBookings.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

module.exports = router; 