const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
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
  sessionType: {
    type: String,
    enum: ['single', 'package', 'subscription'],
    required: true
  },
  sessions: [{
    type: {
      type: String, // Service name (e.g., "Personal Training")
      required: true
    },
    sessionType: {
      type: String,
      enum: ['in-person', 'virtual'],
      required: true
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 15,
      max: 480
    },
    date: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session'
    }
  }],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'stripe', 'cash'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  notes: String,
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed']
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
  paymentHistory: [{
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded']
    },
    transactionId: String,
    paymentMethod: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  cancellationPolicy: {
    hoursBeforeSession: {
      type: Number,
      default: 24
    },
    refundPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: Number,
    endDate: Date,
    daysOfWeek: [String]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ trainerId: 1, createdAt: -1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ paymentStatus: 1 });
BookingSchema.index({ createdAt: 1 });

// Virtual for total sessions count
BookingSchema.virtual('totalSessions').get(function() {
  return this.sessions.length;
});

// Virtual for total duration in hours
BookingSchema.virtual('totalDurationHours').get(function() {
  const totalMinutes = this.sessions.reduce((sum, session) => sum + session.duration, 0);
  return (totalMinutes / 60).toFixed(2);
});

// Virtual for average price per session
BookingSchema.virtual('averagePricePerSession').get(function() {
  if (this.sessions.length === 0) return 0;
  return (this.totalPrice / this.sessions.length).toFixed(2);
});

// Virtual for next session date
BookingSchema.virtual('nextSessionDate').get(function() {
  const upcomingSessions = this.sessions
    .filter(session => new Date(session.date) > new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return upcomingSessions.length > 0 ? upcomingSessions[0].date : null;
});

// Method to check if booking can be cancelled
BookingSchema.methods.canBeCancelled = function() {
  if (!['pending', 'confirmed'].includes(this.status)) {
    return false;
  }

  const nextSession = this.nextSessionDate;
  if (!nextSession) return false;

  const hoursUntilSession = (nextSession - new Date()) / (1000 * 60 * 60);
  return hoursUntilSession >= this.cancellationPolicy.hoursBeforeSession;
};

// Method to calculate refund amount
BookingSchema.methods.calculateRefundAmount = function() {
  if (!this.canBeCancelled()) {
    return 0;
  }

  const refundPercentage = this.cancellationPolicy.refundPercentage / 100;
  return this.totalPrice * refundPercentage;
};

// Method to add status change
BookingSchema.methods.addStatusChange = function(status, changedBy, notes) {
  this.statusHistory.push({
    status,
    changedBy,
    timestamp: new Date(),
    notes
  });
  return this.save();
};

// Method to add payment update
BookingSchema.methods.addPaymentUpdate = function(status, transactionId, paymentMethod, updatedBy) {
  this.paymentHistory.push({
    status,
    transactionId,
    paymentMethod,
    updatedBy,
    timestamp: new Date()
  });
  return this.save();
};

// Pre-save middleware to add initial status to history
BookingSchema.pre('save', function(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.userId,
      timestamp: new Date(),
      notes: 'Booking created'
    });
  }
  next();
});

// Pre-save middleware to add initial payment status to history
BookingSchema.pre('save', function(next) {
  if (this.isNew && this.paymentHistory.length === 0) {
    this.paymentHistory.push({
      status: this.paymentStatus,
      paymentMethod: this.paymentMethod,
      updatedBy: this.userId,
      timestamp: new Date()
    });
  }
  next();
});

// Pre-save middleware to validate dates
BookingSchema.pre('save', function(next) {
  for (const session of this.sessions) {
    if (session.date && session.date < new Date()) {
      const error = new Error('Session dates cannot be in the past');
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Booking', BookingSchema); 