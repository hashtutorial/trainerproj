import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrainerDashboard.css';

const TrainerDashboard = ({ user }) => {
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    specialization: '',
    experience: { years: 0, description: '' },
    services: [],
    availability: {
      monday: { start: '09:00', end: '17:00', available: false },
      tuesday: { start: '09:00', end: '17:00', available: false },
      wednesday: { start: '09:00', end: '17:00', available: false },
      thursday: { start: '09:00', end: '17:00', available: false },
      friday: { start: '09:00', end: '17:00', available: false },
      saturday: { start: '09:00', end: '17:00', available: false },
      sunday: { start: '09:00', end: '17:00', available: false }
    },
    location: { address: '', city: '', state: '', zipCode: '' }
  });

  useEffect(() => {
    fetchTrainerData();
  }, []);

  const fetchTrainerData = async () => {
    try {
      setLoading(true);
      
      // First, try to find the trainer profile by user ID
      try {
        const profileResponse = await axios.get(`/trainers/user/${user.id}`);
        if (profileResponse.data && profileResponse.data.success && profileResponse.data.trainer) {
          setTrainerProfile(profileResponse.data.trainer);
          setProfileForm(profileResponse.data.trainer);
        } else {
          // No profile exists yet, show the profile creation form
          console.log('No trainer profile found, showing profile creation form');
          setShowProfileForm(true);
        }
      } catch (profileError) {
        // Profile doesn't exist yet, show the profile creation form
        console.log('No trainer profile found, showing profile creation form:', profileError.message);
        setShowProfileForm(true);
      }

      // Fetch sessions (only if profile exists)
      if (trainerProfile) {
        try {
          const sessionsResponse = await axios.get('/sessions');
          if (sessionsResponse.data && sessionsResponse.data.success && sessionsResponse.data.sessions) {
            setSessions(sessionsResponse.data.sessions);
          }
        } catch (error) {
          console.log('No sessions available yet:', error.message);
          setSessions([]);
        }

        // Fetch bookings (only if profile exists)
        try {
          // Temporarily remove auth headers for booking requests
          const originalAuth = axios.defaults.headers.common['Authorization'];
          delete axios.defaults.headers.common['Authorization'];
          
          const bookingsResponse = await axios.get(`/bookings?trainerId=${user.id}`);
          if (bookingsResponse.data && bookingsResponse.data.success && bookingsResponse.data.bookings) {
            setBookings(bookingsResponse.data.bookings);
          }
          
          // Restore auth headers
          if (originalAuth) {
            axios.defaults.headers.common['Authorization'] = originalAuth;
          }
        } catch (error) {
          console.log('No bookings available yet:', error.message);
          setBookings([]);
          
          // Restore auth headers in case of error
          const originalAuth = axios.defaults.headers.common['Authorization'];
          if (originalAuth) {
            axios.defaults.headers.common['Authorization'] = originalAuth;
          }
        }

        // Fetch stats (only if profile exists)
        try {
          const statsResponse = await axios.get('/sessions/stats/overview');
          if (statsResponse.data && statsResponse.data.success && statsResponse.data.stats) {
            setStats(statsResponse.data.stats);
          }
        } catch (error) {
          console.log('No stats available yet:', error.message);
          setStats({});
        }
      }

    } catch (error) {
      console.error('Error fetching trainer data:', error);
      // If profile doesn't exist, show the profile creation form
      setShowProfileForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profileForm.specialization) {
      alert('Please select your specialization');
      return;
    }
    
    // Check if at least one day is available
    const hasAvailableDay = Object.values(profileForm.availability).some(day => day.available);
    if (!hasAvailableDay) {
      alert('Please select at least one available day');
      return;
    }
    
    // Validate that available days have time ranges
    const invalidTimeRanges = Object.entries(profileForm.availability)
      .filter(([day, schedule]) => schedule.available)
      .some(([day, schedule]) => !schedule.start || !schedule.end);
    
    if (invalidTimeRanges) {
      alert('Please set start and end times for all selected available days');
      return;
    }
    
    try {
      let response;
      
      if (trainerProfile) {
        // Update existing profile
        response = await axios.put(`/trainers/user/${user.id}`, profileForm);
      } else {
        // Create new profile
        response = await axios.post('/trainers', profileForm);
      }
      
      if (response.data.success) {
        setTrainerProfile(response.data.trainer);
        setShowProfileForm(false);
        // Show success message
        alert(response.data.message || 'Profile saved successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // Show error message
      const errorMessage = error.response?.data?.message || 'Error saving profile. Please try again.';
      alert(errorMessage);
    }
  };

  const addService = () => {
    setProfileForm(prev => ({
      ...prev,
      services: [...prev.services, { name: '', description: '', duration: 60, price: 0 }]
    }));
  };

  const removeService = (index) => {
    setProfileForm(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const updateService = (index, field, value) => {
    setProfileForm(prev => ({
      ...prev,
      services: prev.services.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      )
    }));
  };

  const updateAvailability = (day, field, value) => {
    setProfileForm(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: { ...prev.availability[day], [field]: value }
      }
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': '#3b82f6',
      'in-progress': '#f59e0b',
      'completed': '#10b981',
      'cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="trainer-dashboard-loading">
        <div className="loading-spinner large"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="trainer-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {user.name}! 💪</h1>
          <p>Manage your training business and connect with clients</p>
        </div>
        <div className="header-actions">
          {!trainerProfile ? (
            <button 
              className="btn btn-primary"
              onClick={() => setShowProfileForm(true)}
            >
              <span>Complete Profile</span>
              <div className="btn-bg"></div>
            </button>
          ) : (
            <button 
              className="btn btn-ghost"
              onClick={() => setShowProfileForm(true)}
            >
              <span>Edit Profile</span>
              <div className="btn-bg"></div>
            </button>
          )}
        </div>
      </div>

      {!trainerProfile ? (
        <div className="profile-setup">
          <div className="setup-card">
            <div className="setup-icon">🏋️</div>
            <h2>Complete Your Trainer Profile</h2>
            <p>Set up your profile to start receiving client bookings and grow your business.</p>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => setShowProfileForm(true)}
            >
              <span>Get Started</span>
              <div className="btn-bg"></div>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.scheduled || 0}</div>
                <div className="stat-label">Upcoming Sessions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.completed || 0}</div>
                <div className="stat-label">Completed Sessions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-number">${stats.revenue || 0}</div>
                <div className="stat-label">This Month</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-number">{trainerProfile.rating?.average || 'N/A'}</div>
                <div className="stat-label">Average Rating</div>
              </div>
            </div>
          </div>

          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              Sessions
            </button>
            <button 
              className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              Bookings
            </button>
            <button 
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="overview-grid">
                  <div className="overview-card">
                    <h3>Recent Sessions</h3>
                    <div className="recent-sessions">
                      {sessions.slice(0, 5).map(session => (
                        <div key={session._id} className="session-item">
                          <div className="session-info">
                            <div className="session-client">{session.userId?.name}</div>
                            <div className="session-time">{formatDate(session.date)}</div>
                          </div>
                          <div 
                            className="session-status"
                            style={{ backgroundColor: getStatusColor(session.status) }}
                          >
                            {session.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="overview-card">
                    <h3>Quick Actions</h3>
                    <div className="quick-actions">
                      <button className="action-btn">
                        <span>📅</span>
                        <span>View Schedule</span>
                      </button>
                      <button className="action-btn">
                        <span>👥</span>
                        <span>Manage Clients</span>
                      </button>
                      <button className="action-btn">
                        <span>📊</span>
                        <span>View Analytics</span>
                      </button>
                      <button className="action-btn">
                        <span>💰</span>
                        <span>Payment History</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="sessions-tab">
                <div className="sessions-header">
                  <h3>Your Sessions</h3>
                  <div className="sessions-filters">
                    <select className="filter-select">
                      <option value="all">All Status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="sessions-list">
                  {sessions.map(session => (
                    <div key={session._id} className="session-card">
                      <div className="session-header">
                        <div className="session-client">
                          <div className="client-avatar">
                            {session.userId?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="client-info">
                            <div className="client-name">{session.userId?.name}</div>
                            <div className="session-type">{session.type}</div>
                          </div>
                        </div>
                        <div 
                          className="session-status-badge"
                          style={{ backgroundColor: getStatusColor(session.status) }}
                        >
                          {session.status}
                        </div>
                      </div>
                      
                      <div className="session-details">
                        <div className="detail-item">
                          <span className="detail-label">Date:</span>
                          <span className="detail-value">{formatDate(session.date)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Duration:</span>
                          <span className="detail-value">{session.duration} minutes</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Price:</span>
                          <span className="detail-value">${session.price?.amount || 0}</span>
                        </div>
                      </div>
                      
                      <div className="session-actions">
                        {session.status === 'scheduled' && (
                          <>
                            <button className="btn btn-primary btn-small">
                              <span>Start Session</span>
                              <div className="btn-bg"></div>
                            </button>
                            <button className="btn btn-ghost btn-small">
                              <span>Reschedule</span>
                              <div className="btn-bg"></div>
                            </button>
                          </>
                        )}
                        {session.status === 'in-progress' && (
                          <button className="btn btn-success btn-small">
                            <span>End Session</span>
                            <div className="btn-bg"></div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="bookings-tab">
                <div className="bookings-header">
                  <h3>Client Bookings</h3>
                </div>
                
                <div className="bookings-list">
                  {bookings.map(booking => (
                    <div key={booking._id} className="booking-card">
                      <div className="booking-header">
                        <div className="booking-client">
                          <div className="client-avatar">
                            {booking.userId?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="client-info">
                            <div className="client-name">{booking.userId?.name}</div>
                            <div className="booking-type">{booking.sessionType}</div>
                          </div>
                        </div>
                        <div className="booking-status">
                          <span className={`status-badge ${booking.status}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="booking-details">
                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Total Sessions:</span>
                            <span className="detail-value">{booking.sessions?.length || 0}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Total Price:</span>
                            <span className="detail-value">${booking.totalPrice}</span>
                          </div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Payment Status:</span>
                            <span className={`payment-status ${booking.paymentStatus}`}>
                              {booking.paymentStatus}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Created:</span>
                            <span className="detail-value">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="booking-actions">
                        {booking.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-small">
                              <span>Confirm</span>
                              <div className="btn-bg"></div>
                            </button>
                            <button className="btn btn-ghost btn-small">
                              <span>Decline</span>
                              <div className="btn-bg"></div>
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button className="btn btn-success btn-small">
                            <span>View Details</span>
                            <div className="btn-bg"></div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="profile-tab">
                <div className="profile-header">
                  <h3>Your Profile</h3>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowProfileForm(true)}
                  >
                    <span>Edit Profile</span>
                    <div className="btn-bg"></div>
                  </button>
                </div>
                
                <div className="profile-info">
                  <div className="profile-section">
                    <h4>Basic Information</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Specialization:</span>
                        <span className="info-value">{trainerProfile.specialization}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Experience:</span>
                        <span className="info-value">{trainerProfile.experience?.years} years</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Location:</span>
                        <span className="info-value">
                          {trainerProfile.location?.city}, {trainerProfile.location?.state}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Verification:</span>
                        <span className={`verification-status ${trainerProfile.isVerified ? 'verified' : 'pending'}`}>
                          {trainerProfile.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="profile-section">
                    <h4>Services</h4>
                    <div className="services-list">
                      {trainerProfile.services?.map((service, index) => (
                        <div key={index} className="service-item">
                          <div className="service-name">{service.name}</div>
                          <div className="service-details">
                            <span>{service.duration} min</span>
                            <span>${service.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="profile-section">
                    <h4>Availability</h4>
                    <div className="availability-grid">
                      {Object.entries(trainerProfile.availability || {}).map(([day, schedule]) => (
                        <div key={day} className={`availability-day ${schedule.available ? 'available' : 'unavailable'}`}>
                          <div className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</div>
                          <div className="day-schedule">
                            {schedule.available ? `${schedule.start} - ${schedule.end}` : 'Unavailable'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Profile Form Modal */}
      {showProfileForm && (
        <div className="modal-overlay" onClick={() => setShowProfileForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Your Trainer Profile</h2>
              <button 
                className="modal-close"
                onClick={() => setShowProfileForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-requirements">
                <p><strong>Required Fields:</strong> Specialization and Availability</p>
                <p>Other fields are optional but help clients learn more about you.</p>
              </div>
              
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-group">
                  <label htmlFor="specialization">Specialization *</label>
                  <select
                    id="specialization"
                    value={profileForm.specialization}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, specialization: e.target.value }))}
                    required
                  >
                    <option value="">Select your specialization</option>
                    <option value="Strength Training">Strength Training</option>
                    <option value="Cardio & Weight Loss">Cardio & Weight Loss</option>
                    <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                    <option value="CrossFit">CrossFit</option>
                    <option value="Bodybuilding">Bodybuilding</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="experience-years">Years of Experience</label>
                  <input
                    id="experience-years"
                    type="number"
                    value={profileForm.experience?.years || 0}
                    onChange={(e) => setProfileForm(prev => ({ 
                      ...prev, 
                      experience: { ...prev.experience, years: parseInt(e.target.value) }
                    }))}
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="experience-description">Experience Description</label>
                  <textarea
                    id="experience-description"
                    value={profileForm.experience?.description || ''}
                    onChange={(e) => setProfileForm(prev => ({ 
                      ...prev, 
                      experience: { ...prev.experience, description: e.target.value }
                    }))}
                    placeholder="Tell clients about your experience and background..."
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="form-section">
                <h3>Services & Pricing</h3>
                {profileForm.services.map((service, index) => (
                  <div key={index} className="service-form">
                    <div className="service-form-row">
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        placeholder="Service name"
                      />
                      <input
                        type="number"
                        value={service.duration}
                        onChange={(e) => updateService(index, 'duration', parseInt(e.target.value))}
                        placeholder="Duration (minutes)"
                        min="15"
                      />
                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) => updateService(index, 'price', parseFloat(e.target.value))}
                        placeholder="Price per hour"
                        min="0"
                        step="0.01"
                      />
                      <button
                        type="button"
                        className="remove-service-btn"
                        onClick={() => removeService(index)}
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      value={service.description}
                      onChange={(e) => updateService(index, 'description', e.target.value)}
                      placeholder="Service description"
                      rows="2"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={addService}
                >
                  <span>+ Add Service</span>
                  <div className="btn-bg"></div>
                </button>
              </div>
              
              <div className="form-section">
                <h3>Location</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={profileForm.location?.city || ''}
                      onChange={(e) => setProfileForm(prev => ({ 
                        ...prev, 
                        location: { ...prev.location, city: e.target.value }
                      }))}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={profileForm.location?.state || ''}
                      onChange={(e) => setProfileForm(prev => ({ 
                        ...prev, 
                        location: { ...prev.location, state: e.target.value }
                      }))}
                      placeholder="State"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Availability *</h3>
                <p className="form-help-text">Please select at least one day and set your available hours</p>
                <div className="availability-form">
                  {Object.entries(profileForm.availability).map(([day, schedule]) => (
                    <div key={day} className="day-availability">
                      <div className="day-header">
                        <label className="day-checkbox">
                          <input
                            type="checkbox"
                            checked={schedule.available}
                            onChange={(e) => updateAvailability(day, 'available', e.target.checked)}
                          />
                          <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                        </label>
                      </div>
                      {schedule.available && (
                        <div className="time-inputs">
                          <div className="time-input-group">
                            <label htmlFor={`${day}-start`}>Start Time *</label>
                            <input
                              id={`${day}-start`}
                              type="time"
                              value={schedule.start}
                              onChange={(e) => updateAvailability(day, 'start', e.target.value)}
                              required={schedule.available}
                            />
                          </div>
                          <span>to</span>
                          <div className="time-input-group">
                            <label htmlFor={`${day}-end`}>End Time *</label>
                            <input
                              id={`${day}-end`}
                              type="time"
                              value={schedule.end}
                              onChange={(e) => updateAvailability(day, 'end', e.target.value)}
                              required={schedule.available}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowProfileForm(false)}>
                  <span>Cancel</span>
                  <div className="btn-bg"></div>
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Save Profile</span>
                  <div className="btn-bg"></div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;