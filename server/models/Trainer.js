const mongoose = require('mongoose');

const TrainerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  certifications: [{
    name: {
      type: String,
      required: true
    },
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  experience: {
    years: {
      type: Number,
      min: 0,
      default: 0
    },
    description: String
  },
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    duration: Number, // in minutes
    price: {
      type: Number,
      required: true
    }
  }],
  availability: {
    monday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    tuesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    wednesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    thursday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    friday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    saturday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    },
    sunday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    }
  },
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    reviews: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  clients: {
    total: {
      type: Number,
      default: 0
    },
    active: {
      type: Number,
      default: 0
    }
  },
  achievements: [{
    title: String,
    description: String,
    date: Date,
    imageUrl: String
  }],
  socialMedia: {
    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String,
    website: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes for better query performance
TrainerSchema.index({ specialization: 1 });
TrainerSchema.index({ 'location.city': 1 });
TrainerSchema.index({ 'location.state': 1 });
TrainerSchema.index({ rating: -1 });
TrainerSchema.index({ isVerified: 1 });
TrainerSchema.index({ isActive: 1 });
TrainerSchema.index({ featured: 1 });

// Virtual for average rating calculation
TrainerSchema.virtual('averageRating').get(function() {
  if (this.rating.reviews.length === 0) return 0;
  const total = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / this.rating.reviews.length).toFixed(1);
});

// Method to add a review
TrainerSchema.methods.addReview = function(userId, rating, comment) {
  this.rating.reviews.push({ userId, rating, comment });
  this.rating.count = this.rating.reviews.length;
  
  // Calculate new average
  const total = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = total / this.rating.reviews.length;
  
  return this.save();
};

// Method to get public profile
TrainerSchema.methods.getPublicProfile = function() {
  const trainerObject = this.toObject();
  delete trainerObject.__v;
  return trainerObject;
};

// Pre-save middleware to update rating count
TrainerSchema.pre('save', function(next) {
  if (this.isModified('rating.reviews')) {
    this.rating.count = this.rating.reviews.length;
  }
  next();
});

module.exports = mongoose.model('Trainer', TrainerSchema); 