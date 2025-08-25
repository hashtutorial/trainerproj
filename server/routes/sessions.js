const express = require('express');
const { body, validationResult } = require('express-validator');
const Session = require('../models/Session');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sessions
// @desc    Get user's sessions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
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

    // Filter by session type
    if (type) {
      filter.type = type;
    }

    const sessions = await Session.find(filter)
      .populate('userId', 'name email profileImage')
      .populate('trainerId', 'name email profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions,
      count: sessions.length
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sessions'
    });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Private (participant only)
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('userId', 'name email profileImage')
      .populate('trainerId', 'name email profileImage');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is participant
    if (session.userId._id.toString() !== req.user.id && 
        session.trainerId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching session'
    });
  }
});

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Private
router.post('/', auth, [
  body('trainerId', 'Trainer ID is required').not().isEmpty(),
  body('type', 'Session type is required').isIn(['in-person', 'virtual']),
  body('duration', 'Duration must be a number').isNumeric(),
  body('date', 'Session date is required').isISO8601(),
  body('notes', 'Notes must be a string').optional().isString()
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

    const { trainerId, type, duration, date, notes, location } = req.body;

    // Check if user is not a trainer
    if (req.user.role === 'trainer') {
      return res.status(400).json({
        success: false,
        message: 'Trainers cannot create sessions'
      });
    }

    // Check if trainer exists and is active
    const trainer = await Trainer.findOne({ userId: trainerId, isActive: true });
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or inactive'
      });
    }

    // Check if trainer is available at the requested time
    const sessionDate = new Date(date);
    const dayOfWeek = sessionDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    if (!trainer.availability[dayOfWeek]?.available) {
      return res.status(400).json({
        success: false,
        message: 'Trainer is not available on this day'
      });
    }

    // Check for time conflicts
    const existingSession = await Session.findOne({
      trainerId,
      date: {
        $gte: new Date(sessionDate.getTime() - duration * 60000),
        $lte: new Date(sessionDate.getTime() + duration * 60000)
      },
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Trainer has a conflicting session at this time'
      });
    }

    // Create session
    const session = new Session({
      userId: req.user.id,
      trainerId,
      type,
      duration,
      date: sessionDate,
      notes,
      location,
      status: 'scheduled'
    });

    await session.save();

    // Populate user and trainer info
    await session.populate('userId', 'name email profileImage');
    await session.populate('trainerId', 'name email profileImage');

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      session
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating session'
    });
  }
});

// @route   PUT /api/sessions/:id/status
// @desc    Update session status
// @access  Private (participant only)
router.put('/:id/status', auth, [
  body('status', 'Status is required').isIn(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'])
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

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is participant
    if (session.userId.toString() !== req.user.id && 
        session.trainerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update status
    session.status = status;
    if (notes) {
      session.notes = notes;
    }

    // Add status change to history
    session.statusHistory.push({
      status,
      changedBy: req.user.id,
      timestamp: new Date(),
      notes
    });

    await session.save();

    // Populate user and trainer info
    await session.populate('userId', 'name email profileImage');
    await session.populate('trainerId', 'name email profileImage');

    res.json({
      success: true,
      message: 'Session status updated successfully',
      session
    });

  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating session status'
    });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session details
// @access  Private (participant only)
router.put('/:id', auth, [
  body('date', 'Date must be a valid ISO date').optional().isISO8601(),
  body('duration', 'Duration must be a number').optional().isNumeric(),
  body('notes', 'Notes must be a string').optional().isString()
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

    const { date, duration, notes, location } = req.body;

    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is participant
    if (session.userId.toString() !== req.user.id && 
        session.trainerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow updates if session is scheduled
    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update session that is not in scheduled status'
      });
    }

    // Update fields
    if (date) session.date = new Date(date);
    if (duration) session.duration = duration;
    if (notes !== undefined) session.notes = notes;
    if (location !== undefined) session.location = location;

    await session.save();

    // Populate user and trainer info
    await session.populate('userId', 'name email profileImage');
    await session.populate('trainerId', 'name email profileImage');

    res.json({
      success: true,
      message: 'Session updated successfully',
      session
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating session'
    });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Cancel session
// @access  Private (participant only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is participant
    if (session.userId.toString() !== req.user.id && 
        session.trainerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow cancellation if session is scheduled
    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel session that is not in scheduled status'
      });
    }

    // Soft delete - mark as cancelled
    session.status = 'cancelled';
    session.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user.id,
      timestamp: new Date(),
      notes: 'Session cancelled by user'
    });

    await session.save();

    res.json({
      success: true,
      message: 'Session cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling session'
    });
  }
});

// @route   GET /api/sessions/stats/overview
// @desc    Get session statistics for user
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let filter = {};

    // Filter by user role
    if (req.user.role === 'trainer') {
      filter.trainerId = req.user.id;
    } else {
      filter.userId = req.user.id;
    }

    const totalSessions = await Session.countDocuments(filter);
    const completedSessions = await Session.countDocuments({ ...filter, status: 'completed' });
    const scheduledSessions = await Session.countDocuments({ ...filter, status: 'scheduled' });
    const cancelledSessions = await Session.countDocuments({ ...filter, status: 'cancelled' });

    // Get sessions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = await Session.countDocuments({
      ...filter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      stats: {
        total: totalSessions,
        completed: completedSessions,
        scheduled: scheduledSessions,
        cancelled: cancelledSessions,
        recent: recentSessions,
        completionRate: totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching session statistics'
    });
  }
});

module.exports = router; 