const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['in-person', 'virtual'],
    required: true
  },
  serviceType: {
    type: String, // Service name like 'Personal Training', 'Yoga Session', etc.
    required: false
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480 // 8 hours max
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  price: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    isPaid: {
      type: Boolean,
      default: false
    }
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: Date
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed']
    }
  }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: Number, // every X days/weeks/months
    endDate: Date,
    daysOfWeek: [String] // for weekly recurrence
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SessionSchema.index({ userId: 1, date: -1 });
SessionSchema.index({ trainerId: 1, date: -1 });
SessionSchema.index({ status: 1 });
SessionSchema.index({ date: 1 });
SessionSchema.index({ 'location.city': 1 });

// Virtual for session end time
SessionSchema.virtual('endTime').get(function() {
  if (!this.date || !this.duration) return null;
  return new Date(this.date.getTime() + this.duration * 60000);
});

// Virtual for session duration in hours
SessionSchema.virtual('durationHours').get(function() {
  if (!this.duration) return 0;
  return (this.duration / 60).toFixed(2);
});

// Virtual for session status color (for UI)
SessionSchema.virtual('statusColor').get(function() {
  const statusColors = {
    'scheduled': '#3b82f6',
    'in-progress': '#f59e0b',
    'completed': '#10b981',
    'cancelled': '#ef4444',
    'no-show': '#6b7280'
  };
  return statusColors[this.status] || '#6b7280';
});

// Method to check if session is in the past
SessionSchema.methods.isPast = function() {
  return this.date < new Date();
};

// Method to check if session is today
SessionSchema.methods.isToday = function() {
  const today = new Date();
  return this.date.toDateString() === today.toDateString();
};

// Method to check if session is upcoming (within next 24 hours)
SessionSchema.methods.isUpcoming = function() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return this.date > now && this.date <= tomorrow;
};

// Method to add reminder
SessionSchema.methods.addReminder = function(type, status = 'pending') {
  this.reminders.push({
    type,
    status,
    sentAt: status === 'sent' ? new Date() : null
  });
  return this.save();
};

// Method to add attachment
SessionSchema.methods.addAttachment = function(name, url, type, uploadedBy) {
  this.attachments.push({
    name,
    url,
    type,
    uploadedBy
  });
  return this.save();
};

// Pre-save middleware to add initial status to history
SessionSchema.pre('save', function(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.userId,
      timestamp: new Date(),
      notes: 'Session created'
    });
  }
  next();
});

// Pre-save middleware to validate date
SessionSchema.pre('save', function(next) {
  if (this.date && this.date < new Date()) {
    const error = new Error('Session date cannot be in the past');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Session', SessionSchema); 