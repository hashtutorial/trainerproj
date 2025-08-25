const express = require('express');
const { body, validationResult } = require('express-validator');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/trainers
// @desc    Get all trainers with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/trainers - Starting request');
    
    // Check if Trainer model is available
    if (!Trainer) {
      console.error('Trainer model is not available');
      return res.status(500).json({
        success: false,
        message: 'Trainer model not available'
      });
    }

    // Check database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected. State:', mongoose.connection.readyState);
      console.log('Redirecting to fallback data endpoint');
      
      // Redirect to fallback data when database is not available
      return res.redirect('/api/trainers/fallback');
    }

    const {
      specialization,
      location,
      rating,
      priceMin,
      priceMax,
      experience,
      page = 1,
      limit = 10,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (specialization) {
      filter.specialization = { $regex: specialization, $options: 'i' };
    }
    
    if (location) {
      filter['location.city'] = { $regex: location, $options: 'i' };
    }
    
    if (rating) {
      filter['rating.average'] = { $gte: parseFloat(rating) };
    }
    
    if (experience) {
      filter['experience.years'] = { $gte: parseInt(experience) };
    }

    console.log('Filter:', JSON.stringify(filter, null, 2));

    // Build sort object
    const sort = {};
    if (sortBy === 'rating') {
      sort['rating.average'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'experience') {
      sort['experience.years'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'price') {
      sort['services.price'] = sortOrder === 'desc' ? -1 : 1;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('Executing Trainer.find with filter:', filter);
    
    // Execute query
    const trainers = await Trainer.find(filter)
      .populate('userId', 'name email profileImage')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('Raw trainers from database:', trainers.length);
    console.log('Sample trainer:', trainers[0]);

    // Get total count for pagination
    const total = await Trainer.countDocuments(filter);

    // Process trainers to include user info with safe fallbacks
    const processedTrainers = trainers.map(trainer => {
      const user = trainer.userId;
      
      // Safe fallbacks for missing data
      return {
        _id: trainer._id || 'unknown',
        name: user?.name || 'Unknown Trainer',
        email: user?.email || 'No email available',
        profileImage: user?.profileImage || null,
        specialization: trainer.specialization || 'General Fitness',
        experience: trainer.experience || { years: 0, description: '' },
        location: trainer.location || { city: 'Location not specified', state: '' },
        rating: trainer.rating || { average: 5.0, count: 0, reviews: [] },
        services: trainer.services || [],
        clients: trainer.clients || { total: 0, active: 0 },
        isVerified: trainer.isVerified || false,
        featured: trainer.featured || false,
        tags: trainer.tags || []
      };
    }).filter(trainer => trainer.name !== 'Unknown Trainer'); // Filter out invalid trainers

    console.log(`Found ${processedTrainers.length} trainers out of ${total} total`);

    // If no trainers found, return empty array with success
    if (processedTrainers.length === 0) {
      return res.json({
        success: true,
        trainers: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalTrainers: 0,
          hasNext: false,
          hasPrev: false
        },
        message: 'No trainers found in the database'
      });
    }

    res.json({
      success: true,
      trainers: processedTrainers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTrainers: total,
        hasNext: skip + trainers.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get trainers error:', error);
    
    // If it's a database connection error, redirect to fallback
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      console.log('Database connection error, redirecting to fallback data');
      return res.redirect('/api/trainers/fallback');
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainers'
    });
  }
});

// @route   GET /api/trainers/:id
// @desc    Get trainer by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id)
      .populate('userId', 'name email profileImage bio phone')
      .populate('rating.reviews.userId', 'name profileImage');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    if (!trainer.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile is not available'
      });
    }

    res.json({
      success: true,
      trainer: trainer.getPublicProfile()
    });

  } catch (error) {
    console.error('Get trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer'
    });
  }
});

// @route   GET /api/trainers/user/:userId
// @desc    Get trainer profile by user ID
// @access  Private (trainer only)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Check if user is requesting their own profile
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this profile'
      });
    }

    const trainer = await Trainer.findOne({ userId: req.params.userId })
      .populate('userId', 'name email profileImage bio phone');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found'
      });
    }

    res.json({
      success: true,
      trainer: trainer.getPublicProfile()
    });

  } catch (error) {
    console.error('Get trainer by user ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer profile'
    });
  }
});

// @route   POST /api/trainers
// @desc    Create trainer profile
// @access  Private (trainers only)
router.post('/', auth, [
  body('specialization', 'Specialization is required').not().isEmpty().isIn([
    'Strength Training',
    'Cardio & Weight Loss',
    'Yoga & Flexibility',
    'CrossFit',
    'Bodybuilding'
  ]),
  body('availability', 'Availability is required').isObject(),
  body('availability.*.available', 'At least one day must be available').custom((value, { req }) => {
    const availability = req.body.availability;
    const hasAvailableDay = Object.values(availability).some(day => day.available);
    if (!hasAvailableDay) {
      throw new Error('At least one day must be available');
    }
    return true;
  }),
  body('availability.*.start', 'Start time is required for available days').custom((value, { req, path }) => {
    const day = path.split('.')[1]; // Extract day from path like 'availability.monday.start'
    const availability = req.body.availability;
    if (availability[day] && availability[day].available && !value) {
      throw new Error(`Start time is required for ${day}`);
    }
    return true;
  }),
  body('availability.*.end', 'End time is required for available days').custom((value, { req, path }) => {
    const day = path.split('.')[1]; // Extract day from path like 'availability.monday.end'
    const availability = req.body.availability;
    if (availability[day] && availability[day].available && !value) {
      throw new Error(`End time is required for ${day}`);
    }
    return true;
  })
], async (req, res) => {
  try {
    // Check if user is a trainer
    if (req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Only trainers can create trainer profiles'
      });
    }

    // Check if trainer profile already exists
    const existingProfile = await Trainer.findOne({ userId: req.user.id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Trainer profile already exists'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const trainerData = {
      userId: req.user.id,
      ...req.body
    };

    const trainer = new Trainer(trainerData);
    await trainer.save();

    // Populate user info
    await trainer.populate('userId', 'name email profileImage');

    res.status(201).json({
      success: true,
      message: 'Trainer profile created successfully',
      trainer: trainer.getPublicProfile()
    });

  } catch (error) {
    console.error('Create trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating trainer profile'
    });
  }
});

// @route   PUT /api/trainers/:id
// @desc    Update trainer profile
// @access  Private (owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer profile not found'
      });
    }

    // Check ownership
    if (trainer.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // Update fields
    const updateFields = ['specialization', 'experience', 'services', 'availability', 'location', 'achievements', 'socialMedia', 'tags'];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        trainer[field] = req.body[field];
      }
    });

    await trainer.save();
    await trainer.populate('userId', 'name email profileImage');

    res.json({
      success: true,
      message: 'Trainer profile updated successfully',
      trainer: trainer.getPublicProfile()
    });

  } catch (error) {
    console.error('Update trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating trainer profile'
    });
  }
});

// @route   PUT /api/trainers/user/:userId
// @desc    Update trainer profile by user ID
// @access  Private (trainer only)
router.put('/user/:userId', auth, [
  body('specialization', 'Specialization is required').not().isEmpty().isIn([
    'Strength Training',
    'Cardio & Weight Loss',
    'Yoga & Flexibility',
    'CrossFit',
    'Bodybuilding'
  ]),
  body('availability', 'Availability is required').isObject(),
  body('availability.*.available', 'At least one day must be available').custom((value, { req }) => {
    const availability = req.body.availability;
    const hasAvailableDay = Object.values(availability).some(day => day.available);
    if (!hasAvailableDay) {
      throw new Error('At least one day must be available');
    }
    return true;
  }),
  body('availability.*.start', 'Start time is required for available days').custom((value, { req, path }) => {
    const day = path.split('.')[1];
    const availability = req.body.availability;
    if (availability[day] && availability[day].available && !value) {
      throw new Error(`Start time is required for ${day}`);
    }
    return true;
  }),
  body('availability.*.end', 'End time is required for available days').custom((value, { req, path }) => {
    const day = path.split('.')[1];
    const availability = req.body.availability;
    if (availability[day] && availability[day].available && !value) {
      throw new Error(`End time is required for ${day}`);
    }
    return true;
  })
], async (req, res) => {
  try {
    // Check if user is requesting their own profile
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // Check if user is a trainer
    if (req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Only trainers can update trainer profiles'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let trainer = await Trainer.findOne({ userId: req.params.userId });
    
    if (!trainer) {
      // Create new profile if it doesn't exist
      trainer = new Trainer({
        userId: req.params.userId,
        ...req.body
      });
    } else {
      // Update existing profile
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          trainer[key] = req.body[key];
        }
      });
    }

    await trainer.save();
    await trainer.populate('userId', 'name email profileImage');

    res.json({
      success: true,
      message: trainer.isNew ? 'Trainer profile created successfully' : 'Trainer profile updated successfully',
      trainer: trainer.getPublicProfile()
    });

  } catch (error) {
    console.error('Update trainer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating trainer profile'
    });
  }
});

// @route   POST /api/trainers/:id/reviews
// @desc    Add review to trainer
// @access  Private
router.post('/:id/reviews', auth, [
  body('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
  body('comment', 'Comment is required').not().isEmpty()
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

    const { rating, comment } = req.body;
    const trainer = await Trainer.findById(req.params.id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Check if user already reviewed this trainer
    const existingReview = trainer.rating.reviews.find(
      review => review.userId.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this trainer'
      });
    }

    // Add review
    await trainer.addReview(req.user.id, rating, comment);

    res.json({
      success: true,
      message: 'Review added successfully',
      trainer: trainer.getPublicProfile()
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding review'
    });
  }
});

// @route   GET /api/trainers/search/nearby
// @desc    Search trainers by location
// @access  Public
router.get('/search/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Simple distance calculation (can be improved with geospatial queries)
    const trainers = await Trainer.find({
      isActive: true,
      'location.coordinates.latitude': {
        $gte: parseFloat(latitude) - (radius / 111), // rough conversion
        $lte: parseFloat(latitude) + (radius / 111)
      },
      'location.coordinates.longitude': {
        $gte: parseFloat(longitude) - (radius / (111 * Math.cos(parseFloat(latitude) * Math.PI / 180))),
        $lte: parseFloat(longitude) + (radius / (111 * Math.cos(parseFloat(latitude) * Math.PI / 180)))
      }
    })
    .populate('userId', 'name email profileImage')
    .limit(20);

    const processedTrainers = trainers.map(trainer => {
      const user = trainer.userId;
      return {
        _id: trainer._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        specialization: trainer.specialization,
        experience: trainer.experience,
        location: trainer.location,
        rating: trainer.rating,
        services: trainer.services,
        isVerified: trainer.isVerified
      };
    });

    res.json({
      success: true,
      trainers: processedTrainers,
      count: processedTrainers.length
    });

  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching nearby trainers'
    });
  }
});

module.exports = router; 