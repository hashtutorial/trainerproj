import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Filter, Star, MapPin, Clock, DollarSign, Calendar, Heart, Users, Award, Map, X, Plus, Minus, CreditCard } from 'lucide-react';
import './Dashboard.css'; // Import the custom CSS file

const Dashboard = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Dynamic specialties based on actual trainer data
  const [specialties, setSpecialties] = useState([]);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [bookingData, setBookingData] = useState({
    sessionType: 'single',
    sessions: [{
      type: 'Personal Training',
      sessionType: 'in-person',
      duration: 60,
      date: '',
      time: ''
    }],
    paymentMethod: 'credit_card',
    notes: '',
    specialRequests: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');



  useEffect(() => {
    fetchTrainers();
    createOrUpdateUserProfile();
    getUserLocation();
  }, []);

  // Utility function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance.toFixed(1);
  };

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error getting user location:', error);
          // Default to a central location (you can change this to your city's coordinates)
          setUserLocation({
            lat: 40.7128,
            lng: -74.0060 // New York coordinates as default
          });
        }
      );
    } else {
      // Default location if geolocation is not supported
      setUserLocation({
        lat: 40.7128,
        lng: -74.0060
      });
    }
  };

  // Convert address to coordinates (geocoding)
  const geocodeAddress = async (address) => {
    try {
      // Using a simple geocoding service - you might want to use a more robust one
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    // Return default coordinates if geocoding fails
    return {
      lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Random coordinates near default location
      lng: -74.0060 + (Math.random() - 0.5) * 0.1
    };
  };

  // Initialize map
  const initializeMap = async () => {
    if (!mapRef.current || !userLocation) return;

    // Load Leaflet dynamically
    if (!window.L) {
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
      document.head.appendChild(leafletCSS);

      const leafletJS = document.createElement('script');
      leafletJS.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
      leafletJS.onload = () => createMap();
      document.head.appendChild(leafletJS);
    } else {
      createMap();
    }
  };

  const createMap = async () => {
    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    const map = window.L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 10);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add user location marker
    const userIcon = window.L.divIcon({
      html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      className: 'custom-user-marker',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Your Location</b>')
      .openPopup();

    // Add trainer markers
    for (const trainer of trainers) {
      let trainerCoords;
      
      if (trainer.coordinates) {
        trainerCoords = trainer.coordinates;
      } else if (trainer.location?.address || (trainer.location?.city && trainer.location?.state)) {
        const address = trainer.location.address || `${trainer.location.city}, ${trainer.location.state}`;
        trainerCoords = await geocodeAddress(address);
      } else {
        // Random coordinates around user location if no address available
        trainerCoords = {
          lat: userLocation.lat + (Math.random() - 0.5) * 0.2,
          lng: userLocation.lng + (Math.random() - 0.5) * 0.2
        };
      }

      const distance = calculateDistance(userLocation.lat, userLocation.lng, trainerCoords.lat, trainerCoords.lng);

      const trainerIcon = window.L.divIcon({
        html: `<div style="background: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-trainer-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      window.L.marker([trainerCoords.lat, trainerCoords.lng], { icon: trainerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0;">${trainer.name}</h4>
            <p style="margin: 0 0 4px 0;"><strong>${trainer.specialization}</strong></p>
            <p style="margin: 0 0 4px 0;">📍 ${distance} km away</p>
            <p style="margin: 0 0 8px 0;">💰 ${getHourlyRate(trainer.services)}/hour</p>
            <button onclick="document.dispatchEvent(new CustomEvent('bookTrainer', {detail: '${trainer._id}'}))" 
                    style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
              Book Session
            </button>
          </div>
        `);
    }

    mapInstance.current = map;
  };

  // Effect to initialize map when showing
  useEffect(() => {
    if (showMap && userLocation && trainers.length > 0) {
      setTimeout(initializeMap, 100); // Small delay to ensure DOM is ready
    }
  }, [showMap, userLocation, trainers]);

  // Listen for trainer booking events from map
  useEffect(() => {
    const handleMapBooking = (event) => {
      handleBookSession(event.detail);
    };

    document.addEventListener('bookTrainer', handleMapBooking);
    return () => document.removeEventListener('bookTrainer', handleMapBooking);
  }, []);

  // Get trainer distance for display in cards
  const getTrainerDistance = (trainer) => {
    if (!userLocation) return null;
    
    let trainerCoords;
    if (trainer.coordinates) {
      trainerCoords = trainer.coordinates;
    } else {
      // Return approximate distance for demo
      return `${(Math.random() * 50 + 5).toFixed(1)} km`;
    }
    
    return `${calculateDistance(userLocation.lat, userLocation.lng, trainerCoords.lat, trainerCoords.lng)} km`;
  };

  const createOrUpdateUserProfile = async () => {
    try {
      // Check if user profile already exists
      const checkResponse = await axios.get(`/users/profile/${user.id}`);
      
      if (checkResponse.data && checkResponse.data.success) {
        console.log('User profile already exists');
        return;
      }
    } catch (error) {
      // Profile doesn't exist, create one
      if (error.response?.status === 404) {
        try {
          const userProfile = {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            preferences: {
              fitnessGoals: [],
              preferredTrainingStyle: '',
              experienceLevel: 'beginner',
              budget: {
                min: 0,
                max: 100
              }
            },
            fitnessData: {
              height: null,
              weight: null,
              age: null,
              fitnessLevel: 'beginner'
            },
            bookingHistory: [],
            favoriteTrainers: [],
            createdAt: new Date()
          };

          await axios.post('/users/profile', userProfile);
          console.log('User profile created successfully');
        } catch (createError) {
          console.error('Error creating user profile:', createError);
        }
      } else {
        console.error('Error checking user profile:', error);
      }
    }
  };

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/trainers');
      
      if (response.data && response.data.success && response.data.trainers) {
        const trainersData = response.data.trainers;
        setTrainers(trainersData);
        
        // Extract unique specializations from trainer data
        const uniqueSpecialties = [...new Set(trainersData.map(trainer => trainer.specialization))];
        setSpecialties(uniqueSpecialties);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setError('Unable to load trainers. Please try again later.');
      
      // Fallback to empty state instead of mock data
      setTrainers([]);
      setSpecialties([]);
    } finally {
      setLoading(false);
    }
  };

  const getTrainerImage = (trainerId, trainerName) => {
    // Generate consistent images based on trainer ID
    const imageIds = [
      '1571019613454-1cb2f99b2d8b', // Male trainer 1
      '1594736797933-d0f1dcb14d8f', // Female trainer 1
      '1567013127542-490d757e51cd', // Male trainer 2
      '1559539708-f3792e71aa4b',   // Female trainer 2
      '1583454110551-21f2fa2afe61', // Male trainer 3
      '1506629905607-47b5a87888a9'  // Female trainer 3
    ];
    
    const imageIndex = trainerId ? trainerId.slice(-1).charCodeAt(0) % imageIds.length : 0;
    return `https://images.unsplash.com/photo-${imageIds[imageIndex]}?w=400&h=400&fit=crop&crop=face`;
  };

  const calculateAverageRating = (rating) => {
    if (rating && rating.average) {
      return rating.average.toFixed(1);
    }
    return '5.0'; // Default rating
  };

  const getReviewCount = (rating) => {
    if (rating && rating.count) {
      return rating.count;
    }
    return Math.floor(Math.random() * 200) + 50; // Random count between 50-250
  };

  const getHourlyRate = (services) => {
    if (services && services.length > 0) {
      // Return the price of the first service or average price
      const prices = services.map(service => service.price || 0);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      return Math.round(avgPrice);
    }
    return Math.floor(Math.random() * 50) + 50; // Random price between 50-100
  };

  const getExperienceYears = (experience) => {
    if (experience && experience.years) {
      return experience.years;
    }
    return Math.floor(Math.random() * 10) + 3; // Random between 3-12 years
  };

  const getAvailability = (availability) => {
    if (availability) {
      const availableDays = Object.entries(availability)
        .filter(([day, schedule]) => schedule.available)
        .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3));
      
      if (availableDays.length === 7) return 'Daily';
      if (availableDays.length >= 5) return 'Mon-Fri';
      if (availableDays.length >= 2) return availableDays.slice(0, 2).join('-');
      return availableDays.join(', ') || 'Limited';
    }
    return 'Mon-Fri';
  };

  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = trainer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trainer.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !selectedSpecialty || trainer.specialization === selectedSpecialty;
    
    const trainerRate = getHourlyRate(trainer.services);
    const matchesPrice = !priceRange || 
      (priceRange === 'low' && trainerRate < 60) ||
      (priceRange === 'medium' && trainerRate >= 60 && trainerRate < 80) ||
      (priceRange === 'high' && trainerRate >= 80);
    
    return matchesSearch && matchesSpecialty && matchesPrice;
  });

const handleBookSession = async (trainerId) => {
    try {
      // Find the trainer
      const trainer = trainers.find(t => t._id === trainerId);
      if (!trainer) {
        setError('Trainer not found');
        return;
      }

      // Set selected trainer and reset booking data
      setSelectedTrainer(trainer);
      const defaultServiceName = trainer.services && trainer.services.length > 0 
        ? trainer.services[0].name 
        : 'Personal Training';

      setBookingData({
        sessionType: 'single',
        sessions: [{
          type: defaultServiceName,
          sessionType: 'in-person',
          duration: 60,
          date: '',
          time: ''
        }],
        paymentMethod: 'credit_card',
        notes: '',
        specialRequests: ''
      });
      setBookingError('');
      setShowBookingModal(true);
    } catch (error) {
      console.error('Error initiating booking:', error);
      setError('Error opening booking interface');
    }
  };

  const handleFavoriteTrainer = async (trainerId) => {
    try {
      await axios.post(`/users/profile/${user.id}/favorites`, { trainerId });
      alert('Trainer added to favorites!');
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };


  // Booking modal functions
  const addSession = () => {
    if (bookingData.sessions.length < 10) { // Limit to 10 sessions
      const defaultServiceName = selectedTrainer.services && selectedTrainer.services.length > 0 
        ? selectedTrainer.services[0].name 
        : 'Personal Training';

      setBookingData(prev => ({
        ...prev,
        sessions: [...prev.sessions, {
          type: defaultServiceName,
          sessionType: 'in-person',
          duration: 60,
          date: '',
          time: ''
        }]
      }));
    }
  };

  const removeSession = (index) => {
    if (bookingData.sessions.length > 1) {
      setBookingData(prev => ({
        ...prev,
        sessions: prev.sessions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateSession = (index, field, value) => {
    setBookingData(prev => ({
      ...prev,
      sessions: prev.sessions.map((session, i) => 
        i === index ? { ...session, [field]: value } : session
      )
    }));
  };

  const calculateTotalPrice = () => {
    if (!selectedTrainer || !selectedTrainer.services) return 0;
    
    return bookingData.sessions.reduce((total, session) => {
      // Find the specific service selected for this session
      const selectedService = selectedTrainer.services.find(service => service.name === session.type);
      const servicePrice = selectedService ? selectedService.price : getHourlyRate(selectedTrainer.services);
      return total + (servicePrice * (session.duration / 60));
    }, 0);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');

    try {
      // Validate all sessions have dates and times
      for (let i = 0; i < bookingData.sessions.length; i++) {
        const session = bookingData.sessions[i];
        if (!session.date || !session.time) {
          setBookingError(`Please set date and time for session ${i + 1}`);
          setBookingLoading(false);
          return;
        }
      }

      // Prepare booking data for API
      const bookingPayload = {
        trainerId: selectedTrainer.userId || selectedTrainer._id,
        sessionType: bookingData.sessionType,
        sessions: bookingData.sessions.map(session => ({
          type: session.type, // Use the service name selected by user
          duration: session.duration,
          date: new Date(`${session.date}T${session.time}`).toISOString()
        })),
        paymentMethod: bookingData.paymentMethod,
        notes: bookingData.notes,
        specialRequests: bookingData.specialRequests
      };

      const response = await axios.post('/bookings', bookingPayload);

      if (response.data.success) {
        alert('Booking created successfully! The trainer will be notified and you will receive a confirmation email.');
        setShowBookingModal(false);
        setSelectedTrainer(null);
      } else {
        setBookingError(response.data.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError(error.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    return new Date(`${dateStr}T${timeStr}`).toLocaleString();
  };
  
  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h1>
            Welcome back, <span className="highlight">{user?.name}!</span>
          </h1>
          <p>Find the perfect trainer to achieve your fitness goals</p>
          
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <Users className="stat-icon" />
              <div className="stat-number">{trainers.length}+</div>
              <div className="stat-label">Expert Trainers</div>
            </div>
            <div className="stat-card">
              <Award className="stat-icon green" />
              <div className="stat-number">4.8</div>
              <div className="stat-label">Average Rating</div>
            </div>
            <div className="stat-card">
              <Clock className="stat-icon blue" />
              <div className="stat-number">24/7</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="filters-container">
          <div className="filters-grid">
            {/* Search */}
            <div className="filter-group">
              <Search className="filter-icon" />
              <input
                type="text"
                placeholder="Search trainers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Specialty Filter */}
            <div className="filter-group">
              <Filter className="filter-icon" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="filter-select"
              >
                <option value="">All Specialties</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="filter-group">
              <DollarSign className="filter-icon" />
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Prices</option>
                <option value="low">Under $60/hr</option>
                <option value="medium">$60-80/hr</option>
                <option value="high">$80+/hr</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialty('')
                setPriceRange('');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>

            {/* Map Toggle */}
            <button
              onClick={() => setShowMap(!showMap)}
              className={`map-toggle-btn ${showMap ? 'active' : ''}`}
              style={{
                background: showMap ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <Map size={16} />
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      {showMap && (
        <div className="map-section" style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1rem',
          margin: '2rem auto',
          maxWidth: '1200px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="map-header" style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ margin: 0, color: '#1f2937' }}>Trainers Near You</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%' }}></div>
                <span>Your Location</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></div>
                <span>Trainers</span>
              </div>
            </div>
          </div>
          <div 
            ref={mapRef} 
            style={{ 
              height: '400px', 
              width: '100%', 
              borderRadius: '0.5rem',
              overflow: 'hidden'
            }}
          ></div>
        </div>
      )}

      {/* Trainers Grid */}
      <div className="trainers-section">
        <div className="trainers-header">
          <h2>Available Trainers</h2>
          <p>{filteredTrainers.length} trainers found</p>
        </div>

        {error && (
          <div className="error-message" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <p>{error}</p>
            <button 
              onClick={fetchTrainers}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="trainers-grid">
            {filteredTrainers.map(trainer => (
              <div key={trainer._id} className="trainer-card">
                {/* Trainer Image */}
                <div className="trainer-image-container">
                  <img 
                    src={getTrainerImage(trainer._id, trainer.name)} 
                    alt={trainer.name}
                    className="trainer-image"
                  />
                  <button 
                    className="trainer-favorite"
                    onClick={() => handleFavoriteTrainer(trainer._id)}
                  >
                    <Heart />
                  </button>
                  <div className="trainer-rating-badge">
                    <Star />
                    {calculateAverageRating(trainer.rating)} ({getReviewCount(trainer.rating)})
                  </div>
                </div>

                {/* Trainer Info */}
                <div className="trainer-info">
                  <div className="trainer-header">
                    <div>
                      <h3 className="trainer-name">{trainer.name}</h3>
                      <div className="trainer-location">
                        <MapPin />
                        {trainer.location?.city && trainer.location?.state 
                          ? `${trainer.location.city}, ${trainer.location.state}`
                          : 'Location not specified'
                        }
                      </div>
                    </div>
                    <div className="trainer-price">
                      <div className="trainer-price-amount">${getHourlyRate(trainer.services)}</div>
                      <div className="trainer-price-label">per hour</div>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="trainer-specialties">
                    <span className="specialty-tag">
                      {trainer.specialization}
                    </span>
                    {trainer.services && trainer.services.length > 1 && (
                      <span className="specialty-tag specialty-more">
                        +{trainer.services.length - 1} services
                      </span>
                    )}
                  </div>

                  <p className="trainer-bio">
                    {trainer.experience?.description || 
                     `Professional ${trainer.specialization} trainer with ${getExperienceYears(trainer.experience)} years of experience.`
                    }
                  </p>

                  {/* Stats */}
                  <div className="trainer-stats">
                    <div className="trainer-stat">
                      <Award />
                      {getExperienceYears(trainer.experience)} years
                    </div>
                    <div className="trainer-stat">
                      <Clock />
                      {getAvailability(trainer.availability)}
                    </div>
                    {userLocation && (
                      <div className="trainer-stat distance">
                        <MapPin />
                        {getTrainerDistance(trainer)} away
                      </div>
                    )}
                    {trainer.isVerified && (
                      <div className="trainer-stat verified">
                        <Star />
                        Verified
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="trainer-actions">
                    <button 
                      className="btn-book"
                      onClick={() => handleBookSession(trainer._id)}
                    >
                      Book Session
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTrainers.length === 0 && !error && (
          <div className="no-results">
            <div className="no-results-emoji">😔</div>
            <h3>No trainers found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        )}
      </div>
 {/* Booking Modal */}
      {showBookingModal && selectedTrainer && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Session with {selectedTrainer.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowBookingModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="trainer-summary">
              <img 
                src={getTrainerImage(selectedTrainer._id, selectedTrainer.name)}
                alt={selectedTrainer.name}
                className="trainer-modal-image"
              />
              <div className="trainer-modal-info">
                <h3>{selectedTrainer.name}</h3>
                <p className="specialization">{selectedTrainer.specialization}</p>
                <div className="rating">
                  <Star size={16} fill="gold" color="gold" />
                  {calculateAverageRating(selectedTrainer.rating)}
                </div>
                <p className="rate">${getHourlyRate(selectedTrainer.services)}/hour</p>
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="booking-form">
              {/* Session Type */}
              <div className="form-group">
                <label>Session Type</label>
                <select
                  value={bookingData.sessionType}
                  onChange={(e) => setBookingData(prev => ({ ...prev, sessionType: e.target.value }))}
                  className="form-select"
                >
                  <option value="single">Single Session</option>
                  <option value="package">Package (Multiple Sessions)</option>
                </select>
              </div>

              {/* Sessions */}
              <div className="sessions-section">
                <div className="section-header">
                  <h4>Session Details</h4>
                  {bookingData.sessionType === 'package' && (
                    <button
                      type="button"
                      onClick={addSession}
                      className="btn-add-session"
                      disabled={bookingData.sessions.length >= 10}
                    >
                      <Plus size={16} /> Add Session
                    </button>
                  )}
                </div>

                {bookingData.sessions.map((session, index) => (
                  <div key={index} className="session-item">
                    <div className="session-header">
                      <h5>Session {index + 1}</h5>
                      {bookingData.sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSession(index)}
                          className="btn-remove-session"
                        >
                          <Minus size={16} />
                        </button>
                      )}
                    </div>

                    <div className="session-fields">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Service</label>
                          <select
                            value={session.type}
                            onChange={(e) => updateSession(index, 'type', e.target.value)}
                            className="form-select"
                          >
                            {selectedTrainer.services && selectedTrainer.services.length > 0 ? (
                              selectedTrainer.services.map((service, serviceIndex) => (
                                <option key={serviceIndex} value={service.name}>
                                  {service.name} - ${service.price}/hr
                                </option>
                              ))
                            ) : (
                              <option value="Personal Training">Personal Training</option>
                            )}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Session Type</label>
                          <select
                            value={session.sessionType}
                            onChange={(e) => updateSession(index, 'sessionType', e.target.value)}
                            className="form-select"
                          >
                            <option value="in-person">In-Person</option>
                            <option value="virtual">Virtual</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Duration (minutes)</label>
                          <select
                            value={session.duration}
                            onChange={(e) => updateSession(index, 'duration', parseInt(e.target.value))}
                            className="form-select"
                          >
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                            <option value={90}>90 minutes</option>
                            <option value={120}>2 hours</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Date</label>
                          <input
                            type="date"
                            value={session.date}
                            onChange={(e) => updateSession(index, 'date', e.target.value)}
                            className="form-input"
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Time</label>
                          <input
                            type="time"
                            value={session.time}
                            onChange={(e) => updateSession(index, 'time', e.target.value)}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-options">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={bookingData.paymentMethod === 'credit_card'}
                      onChange={(e) => setBookingData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    />
                    <CreditCard size={20} />
                    <span>Credit Card</span>
                  </label>
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={bookingData.paymentMethod === 'paypal'}
                      onChange={(e) => setBookingData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    />
                    <span>💳</span>
                    <span>PayPal</span>
                  </label>
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={bookingData.paymentMethod === 'stripe'}
                      onChange={(e) => setBookingData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    />
                    <span>💰</span>
                    <span>Stripe</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-textarea"
                  placeholder="Any additional notes for the trainer..."
                  rows="3"
                />
              </div>

              {/* Special Requests */}
              <div className="form-group">
                <label>Special Requests (Optional)</label>
                <textarea
                  value={bookingData.specialRequests}
                  onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                  className="form-textarea"
                  placeholder="Any special requirements or requests..."
                  rows="2"
                />
              </div>

              {/* Price Summary */}
              <div className="price-summary">
                <div className="price-breakdown">
                  {bookingData.sessions.map((session, index) => {
                    const selectedService = selectedTrainer.services.find(service => service.name === session.type);
                    const servicePrice = selectedService ? selectedService.price : getHourlyRate(selectedTrainer.services);
                    return (
                      <div key={index} className="price-item">
                        <span>Session {index + 1} - {session.type} ({session.duration} min)</span>
                        <span>${(servicePrice * (session.duration / 60)).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="total-price">
                  <strong>Total: ${calculateTotalPrice().toFixed(2)}</strong>
                </div>
              </div>

              {bookingError && (
                <div className="error-message" style={{ marginBottom: '1rem' }}>
                  {bookingError}
                </div>
              )}

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="btn-cancel"
                  disabled={bookingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-book"
                  disabled={bookingLoading}
                >
                  {bookingLoading ? 'Creating Booking...' : `Book Sessions - $${calculateTotalPrice().toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;