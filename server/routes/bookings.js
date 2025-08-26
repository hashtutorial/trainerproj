const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10, userId, trainerId } = req.query;
    let filter = {};

    // Filter by user or trainer ID if provided
    if (userId) {
      filter.userId = userId;
    }
    if (trainerId) {
      filter.trainerId = trainerId;
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

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Public
router.get('/:id', async (req, res) => {
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
// @access  Public
router.post('/', [
  body('userId', 'User ID is required').not().isEmpty(),
  body('trainerId', 'Trainer ID is required').not().isEmpty(),
  body('sessionType', 'Session type is required').isIn(['single', 'package', 'subscription']),
  body('sessions', 'Sessions array is required').isArray({ min: 1 }),
  body('sessions.*.type', 'Session type is required').isIn(['in-person', 'virtual']),
  body('sessions.*.serviceName', 'Service name is required').not().isEmpty(),
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

    const { userId, trainerId, sessionType, sessions, paymentMethod, notes, specialRequests } = req.body;

    // Check if trainer exists and is active
    const trainer = await Trainer.findOne({ userId: trainerId, isActive: true });
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or inactive'
      });
    }

    // Calculate total price
    let totalPrice = 0;
    const sessionServices = [];

    for (const session of sessions) {
      // Find matching service from trainer
      const service = trainer.services.find(s => s.name === session.serviceName);
      if (!service) {
        return res.status(400).json({
          success: false,
          message: `Service type '${session.serviceName}' not found for this trainer`
        });
      }

      const sessionPrice = (service.price / 60) * session.duration; // Price per minute
      totalPrice += sessionPrice;
      sessionServices.push({
        ...session,
        price: sessionPrice,
        serviceId: service._id
      });
    }

    // Create booking
    const booking = new Booking({
      userId,
      trainerId,
      sessionType,
      sessions: sessionServices,
      totalPrice,
      paymentMethod,
      notes,
      specialRequests,
      status: 'pending'
    });

    await booking.save();

    // Create individual sessions
    const createdSessions = [];
    for (const sessionData of sessionServices) {
      const session = new Session({
        userId,
        trainerId,
        type: sessionData.type, // 'in-person' or 'virtual'
        serviceName: sessionData.serviceName, // Service name like 'Personal Training'
        duration: sessionData.duration,
        date: new Date(sessionData.date),
        notes: notes,
        price: {
          amount: sessionData.price,
          currency: 'USD'
        },
        status: 'scheduled'
      });

      await session.save();
      createdSessions.push(session);
    }

    // Update booking with session IDs
    booking.sessions = createdSessions.map(session => ({
      ...session.toObject(),
      sessionId: session._id
    }));

    await booking.save();

    // Populate references
    await booking.populate('userId', 'name email profileImage');
    await booking.populate('trainerId', 'name email profileImage');
    await booking.populate('sessions.sessionId');

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
// @access  Public
router.put('/:id/status', [
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

    const { status, notes, userId } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
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
      changedBy: userId,
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
                changedBy: userId,
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
// @access  Public
router.put('/:id/payment', [
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

    const { paymentStatus, transactionId, paymentMethod, userId } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
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
      updatedBy: userId,
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
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
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
              changedBy: userId,
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
      changedBy: userId,
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