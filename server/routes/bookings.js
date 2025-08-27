const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get user's bookings (requires authentication)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = {};

    // Filter by user role
    if (req.user.role === 'trainer') {
      filter.trainerId = req.user.id;
    } else {
      filter.userId = req.user.id;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email profileImage')
      .populate('trainerId', 'name email profileImage')
      .populate('sessionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      bookings,
      count: bookings.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBookings: total,
        hasNext: skip + bookings.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings'
    });
  }
});

// @route   GET /api/bookings/trainer/:trainerId
// @desc    Get bookings for a specific trainer (no authentication required)
// @access  Public
router.get('/trainer/:trainerId', async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Filter by trainer ID - handle both string and ObjectId
    const mongoose = require('mongoose');
    let filter = { 
      $or: [
        { trainerId: trainerId },
        { trainerId: mongoose.Types.ObjectId.isValid(trainerId) ? new mongoose.Types.ObjectId(trainerId) : trainerId }
      ]
    };
    
    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email profileImage')
      .populate('trainerId', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      bookings,
      count: bookings.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBookings: total,
        hasNext: skip + bookings.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get trainer bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer bookings'
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private (participant only)
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email profileImage')
      .populate('trainerId', 'name email profileImage')
      .populate('sessionId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is participant
    if (booking.userId._id.toString() !== req.user.id && 
        booking.trainerId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching booking'
    });
  }
});

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Public (removed JWT requirement)
router.post('/', [
  body('trainerId', 'Trainer ID is required').not().isEmpty(),
  body('sessionType', 'Session type is required').isIn(['single', 'package', 'subscription']),
  body('sessions', 'Sessions array is required').isArray({ min: 1 }),
  body('sessions.*.type', 'Session type is required').not().isEmpty(),
  body('sessions.*.duration', 'Duration must be a number').isNumeric(),
  body('sessions.*.date', 'Session date is required').isISO8601(),
  body('paymentMethod', 'Payment method is required').isIn(['credit_card', 'paypal', 'stripe', 'cash'])
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

    const { trainerId, sessionType, sessions, paymentMethod, notes, specialRequests, userId, userName, userEmail } = req.body;

    // Validate user information
    if (!userId || !userName || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User information is required (userId, userName, userEmail)'
      });
    }

    // Check if trainer exists and is active
    let trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      // Try finding by userId if direct ID lookup fails
      trainer = await Trainer.findOne({ userId: trainerId, isActive: true });
    }
    
    // Handle fallback trainers (when database is not available)
    if (!trainer && trainerId.startsWith('fallback-')) {
      // Create a mock trainer object for fallback trainers
      const fallbackTrainers = {
        'fallback-1': {
          userId: { _id: 'fallback-user-1' },
          services: [{ name: 'Personal Training', price: 85, duration: 60, _id: 'fallback-service-1' }],
          isActive: true
        },
        'fallback-2': {
          userId: { _id: 'fallback-user-2' },
          services: [{ name: 'Yoga Session', price: 70, duration: 60, _id: 'fallback-service-2' }],
          isActive: true
        },
        'fallback-3': {
          userId: { _id: 'fallback-user-3' },
          services: [{ name: 'CrossFit Training', price: 90, duration: 60, _id: 'fallback-service-3' }],
          isActive: true
        },
        'fallback-4': {
          userId: { _id: 'fallback-user-4' },
          services: [{ name: 'Cardio Training', price: 75, duration: 60, _id: 'fallback-service-4' }],
          isActive: true
        },
        'fallback-5': {
          userId: { _id: 'fallback-user-5' },
          services: [{ name: 'Bodybuilding Training', price: 95, duration: 60, _id: 'fallback-service-5' }],
          isActive: true
        },
        'fallback-6': {
          userId: { _id: 'fallback-user-6' },
          services: [{ name: 'Pilates Session', price: 80, duration: 60, _id: 'fallback-service-6' }],
          isActive: true
        }
      };
      
      trainer = fallbackTrainers[trainerId];
    }
    
    if (!trainer || !trainer.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or inactive'
      });
    }

    // Calculate total price
    let totalPrice = 0;
    const sessionServices = [];

    for (const session of sessions) {
      // Find matching service from trainer (case-insensitive and flexible matching)
      let service = trainer.services.find(s => 
        s.name.toLowerCase() === session.type.toLowerCase() ||
        s.name.toLowerCase().includes(session.type.toLowerCase()) ||
        session.type.toLowerCase().includes(s.name.toLowerCase())
      );
      
      // If no exact match, try to find any service or use the first available service
      if (!service && trainer.services.length > 0) {
        service = trainer.services[0]; // Use first available service as fallback
      }
      
      if (!service) {
        return res.status(400).json({
          success: false,
          message: `No services available for this trainer. Please contact the trainer to set up services.`
        });
      }

      const sessionPrice = (service.price / 60) * session.duration; // Price per minute
      totalPrice += sessionPrice;
      sessionServices.push({
        type: 'in-person', // Use correct enum value  
        duration: session.duration,
        date: new Date(session.date),
        price: {
          amount: sessionPrice,
          currency: 'USD',
          isPaid: false
        },
        serviceId: service._id
      });
    }

    // Create booking - use trainer's userId, not trainer document ID
    const booking = new Booking({
      userId: userId,
      trainerId: trainer.userId._id || trainer.userId, // Handle both populated and non-populated userId
      sessionType,
      sessions: sessionServices,
      totalPrice,
      paymentMethod,
      notes,
      specialRequests,
      status: 'pending'
    });

    await booking.save();

    // Note: Skipping population since we're not using strict ObjectId references
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating booking'
    });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private (participant only)
router.put('/:id/status', auth, [
  body('status', 'Status is required').isIn(['pending', 'confirmed', 'cancelled', 'completed'])
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

    const { status, notes } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is participant
    if (booking.userId.toString() !== req.user.id && 
        booking.trainerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update status
    booking.status = status;
    if (notes) {
      booking.notes = notes;
    }

    // Add status change to history
    booking.statusHistory.push({
      status,
      changedBy: req.user.id,
      timestamp: new Date(),
      notes
    });

    // Update related sessions if booking is cancelled
    if (status === 'cancelled') {
      for (const sessionData of booking.sessions) {
        if (sessionData.sessionId) {
          await Session.findByIdAndUpdate(sessionData.sessionId, {
            status: 'cancelled',
            $push: {
              statusHistory: {
                status: 'cancelled',
                changedBy: req.user.id,
                timestamp: new Date(),
                notes: 'Cancelled due to booking cancellation'
              }
            }
          });
        }
      }
    }

    await booking.save();

    // Populate references
    await booking.populate('userId', 'name email profileImage');
    await booking.populate('trainerId', 'name email profileImage');
    await booking.populate('sessions.sessionId');

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking status'
    });
  }
});

// @route   PUT /api/bookings/:id/payment
// @desc    Update payment status
// @access  Private (participant only)
router.put('/:id/payment', auth, [
  body('paymentStatus', 'Payment status is required').isIn(['pending', 'paid', 'failed', 'refunded'])
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

    const { paymentStatus, transactionId, paymentMethod } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is participant
    if (booking.userId.toString() !== req.user.id && 
        booking.trainerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update payment info
    booking.paymentStatus = paymentStatus;
    if (transactionId) {
      booking.transactionId = transactionId;
    }
    if (paymentMethod) {
      booking.paymentMethod = paymentMethod;
    }

    // Add payment update to history
    booking.paymentHistory.push({
      status: paymentStatus,
      transactionId,
      paymentMethod,
      updatedBy: req.user.id,
      timestamp: new Date()
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      booking
    });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Cancel booking
// @access  Private (participant only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is participant
    if (booking.userId.toString() !== req.user.id && 
        booking.trainerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow cancellation if booking is pending or confirmed
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking in current status'
      });
    }

    // Cancel all related sessions
    for (const sessionData of booking.sessions) {
      if (sessionData.sessionId) {
        await Session.findByIdAndUpdate(sessionData.sessionId, {
          status: 'cancelled',
          $push: {
            statusHistory: {
              status: 'cancelled',
              changedBy: req.user.id,
              timestamp: new Date(),
              notes: 'Cancelled due to booking cancellation'
            }
          }
        });
      }
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user.id,
      timestamp: new Date(),
      notes: 'Booking cancelled by user'
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling booking'
    });
  }
});

module.exports = router; 