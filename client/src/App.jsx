import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import TrainerDashboard from './components/trainer/TrainerDashboard';
import UserDashboard from './components/user/Dashboard'; // Renamed import to avoid conflict

// Set up axios defaults
axios.defaults.baseURL = '/api';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Floating Animation Component
const FloatingElements = () => {
  return (
    <div className="floating-elements">
      <div className="floating-shape shape-1"></div>
      <div className="floating-shape shape-2"></div>
      <div className="floating-shape shape-3"></div>
      <div className="floating-shape shape-4"></div>
      <div className="floating-shape shape-5"></div>
    </div>
  );
};

// Navigation Component
const Navigation = ({ user, onLogout, onNavigate }) => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => onNavigate('welcome')}>
          <div className="brand-icon">💪</div>
          <h2>TRAINERLOCATOR</h2>
        </div>
        <div className="nav-links">
          {user ? (
            <>
              <div className="user-info">
                <div className="avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>Welcome, {user.name}!</span>
              </div>
              <button onClick={onLogout} className="btn btn-ghost">
                <span>Logout</span>
                <div className="btn-bg"></div>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onNavigate('login')} className="btn btn-ghost">
                <span>Login</span>
                <div className="btn-bg"></div>
              </button>
              <button onClick={() => onNavigate('register')} className="btn btn-primary">
                <span>Get Started</span>
                <div className="btn-bg"></div>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ end, suffix = "", duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const startCount = 0;
    
    const animate = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * (end - startCount) + startCount));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
};

// Login Component
const Login = ({ onLogin, onNavigate }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/login', formData);
      
      // Check if login was successful
      if (response.data.success && response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        onLogin(response.data.user);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background"></div>
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue your fitness journey</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="form-input"
            />
            <div className="input-highlight"></div>
          </div>
          
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="form-input"
            />
            <div className="input-highlight"></div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            <div className="btn-bg"></div>
            {loading && <div className="loading-spinner"></div>}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have an account? 
            <button onClick={() => onNavigate('register')} className="link-btn">
              Join Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = ({ onRegister, onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/register', formData);
      
      // Check if registration was successful
      if (response.data.success && response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        onRegister(response.data.user);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background register-bg"></div>
      <div className="auth-card">
        <div className="auth-header">
          <h2>Join TrainerLocator</h2>
          <p>Start your transformation today</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="form-input"
            />
            <div className="input-highlight"></div>
          </div>
          
          <div className="form-group">
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="form-input"
            />
            <div className="input-highlight"></div>
          </div>
          
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="form-input"
            />
            <div className="input-highlight"></div>
          </div>
          
          <div className="form-group">
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="form-select"
            >
              <option value="user">I'm looking for a trainer</option>
              <option value="trainer">I'm a personal trainer</option>
            </select>
            <div className="input-highlight"></div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            <div className="btn-bg"></div>
            {loading && <div className="loading-spinner"></div>}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? 
            <button onClick={() => onNavigate('login')} className="link-btn">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Enhanced Trainer Card Component
const TrainerCard = ({ trainer }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cardError, setCardError] = useState(false);
  
  // Defensive programming - check if trainer data exists
  if (!trainer || !trainer.name) {
    return (
      <div className="trainer-card">
        <div className="trainer-content">
          <h3>Trainer Not Available</h3>
          <p>This trainer's information is currently unavailable.</p>
        </div>
      </div>
    );
  }

  // Safe access to trainer properties with fallbacks
  const safeTrainer = {
    name: trainer.name || 'Unknown Trainer',
    specialization: trainer.specialization || 'General Fitness',
    location: trainer.location || 'Location not specified',
    rating: trainer.rating || '5.0',
    experience: trainer.experience || '5+',
    clients: trainer.clients || '100+',
    pricePerHour: trainer.pricePerHour || '80'
  };
  
  return (
    <div className="trainer-card">
      <div className="trainer-image">
        <img 
          src={`https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}?w=300&h=300&fit=crop&auto=format&q=80`}
          alt={safeTrainer.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => setCardError(true)}
          className={imageLoaded ? 'loaded' : ''}
        />
        <div className="trainer-overlay">
          <div className="trainer-rating">
            <span className="stars">⭐⭐⭐⭐⭐</span>
            <span className="rating-number">{safeTrainer.rating}</span>
          </div>
        </div>
      </div>
      
      <div className="trainer-content">
        <h3>{safeTrainer.name}</h3>
        <p className="specialization">{safeTrainer.specialization}</p>
        
        <div className="trainer-stats">
          <div className="stat">
            <span className="stat-number">{safeTrainer.experience}</span>
            <span className="stat-label">Years</span>
          </div>
          <div className="stat">
            <span className="stat-number">{safeTrainer.clients}</span>
            <span className="stat-label">Clients</span>
          </div>
          <div className="stat">
            <span className="stat-number">${safeTrainer.pricePerHour}</span>
            <span className="stat-label">Per Hour</span>
          </div>
        </div>
        
        <div className="trainer-location">
          <span className="location-icon">📍</span>
          {safeTrainer.location}
        </div>
        
        <div className="trainer-actions">
          <button className="btn btn-primary btn-small">
            <span>Book Session</span>
            <div className="btn-bg"></div>
          </button>
          <button className="btn btn-ghost btn-small">
            <span>View Profile</span>
            <div className="btn-bg"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Legacy Dashboard Component - keeping for backward compatibility but not used in routing
const LegacyDashboard = ({ user }) => {
  const [trainers, setTrainers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trainerError, setTrainerError] = useState(null);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setTrainerError(null);
      setLoading(true);
      
      console.log('Fetching trainers from /trainers endpoint...');
      const response = await axios.get('/trainers');
      console.log('Trainers API response:', response.data);
      
      if (response.data && response.data.success && response.data.trainers) {
        console.log(`Setting ${response.data.trainers.length} trainers`);
        setTrainers(response.data.trainers || []);
      } else {
        console.log('Invalid response structure, using demo data');
        console.log('Response data:', response.data);
        setTrainers(getDemoTrainers());
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Unable to fetch trainers, showing demo data';
      if (error.response?.status === 500) {
        errorMessage = 'Server error while fetching trainers, showing demo data';
      } else if (error.response?.status === 404) {
        errorMessage = 'Trainers endpoint not found, showing demo data';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server, showing demo data';
      }
      
      setTrainerError(errorMessage);
      setTrainers(getDemoTrainers());
    } finally {
      setLoading(false);
    }
  };

  const getDemoTrainers = () => [
    { _id: '1', name: 'Mike Johnson', specialization: 'Strength Training', location: 'New York, NY', rating: 4.9, experience: '8 years', clients: 150, pricePerHour: 85 },
    { _id: '2', name: 'Sarah Williams', specialization: 'Yoga & Flexibility', location: 'Los Angeles, CA', rating: 4.8, experience: '6 years', clients: 200, pricePerHour: 70 },
    { _id: '3', name: 'David Chen', specialization: 'CrossFit', location: 'Chicago, IL', rating: 4.9, experience: '10 years', clients: 120, pricePerHour: 90 },
    { _id: '4', name: 'Emma Davis', specialization: 'Cardio & Weight Loss', location: 'Miami, FL', rating: 4.7, experience: '5 years', clients: 180, pricePerHour: 75 },
    { _id: '5', name: 'Alex Rodriguez', specialization: 'Bodybuilding', location: 'Austin, TX', rating: 5.0, experience: '12 years', clients: 90, pricePerHour: 95 },
    { _id: '6', name: 'Lisa Thompson', specialization: 'Pilates', location: 'Seattle, WA', rating: 4.8, experience: '7 years', clients: 160, pricePerHour: 80 }
  ];

  const categories = [
    { id: 'all', name: 'All Trainers', icon: '🏋️' },
    { id: 'strength', name: 'Strength', icon: '💪' },
    { id: 'cardio', name: 'Cardio', icon: '🏃' },
    { id: 'yoga', name: 'Yoga', icon: '🧘' },
    { id: 'crossfit', name: 'CrossFit', icon: '🤸' },
  ];

  const filteredTrainers = trainers.filter(trainer => {
    if (!trainer) return false;
    
    const matchesSearch = trainer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trainer.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           trainer.specialization?.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Find Your Perfect
            <span className="gradient-text"> Trainer</span>
          </h1>
          <p className="hero-subtitle">
            Connect with elite fitness professionals and transform your life
          </p>
          
          <div className="search-container">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search trainers, specializations, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button className="search-btn">
                <span>🔍</span>
              </button>
            </div>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">
                <AnimatedCounter end={500} suffix="+" />
              </div>
              <div className="stat-label">Expert Trainers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">
                <AnimatedCounter end={10000} suffix="+" />
              </div>
              <div className="stat-label">Success Stories</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">
                <AnimatedCounter end={50} />
              </div>
              <div className="stat-label">Cities</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span>{category.name}</span>
              <div className="btn-bg"></div>
            </button>
          ))}
        </div>

        <div className="results-header">
          <h2>
            {filteredTrainers.length} {selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory)?.name : ''} Trainers Found
          </h2>
        </div>

        {/* Trainer Error Message - Only shows in trainer section */}
        {trainerError && (
          <div className="trainer-error-message" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            color: '#ef4444', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>⚠️ {trainerError}</p>
            <button 
              onClick={fetchTrainers}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
            <p>Finding the best trainers for you...</p>
          </div>
        ) : (
          <div className="trainers-grid">
            {filteredTrainers.map((trainer, index) => (
              <div key={trainer._id} className="trainer-card-wrapper" style={{ animationDelay: `${index * 0.1}s` }}>
                <TrainerCard trainer={trainer} />
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTrainers.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No trainers found</h3>
            <p>Try adjusting your search criteria or browse all trainers</p>
            <button 
              onClick={() => {setSearchTerm(''); setSelectedCategory('all');}}
              className="btn btn-primary"
            >
              <span>Show All Trainers</span>
              <div className="btn-bg"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Welcome Component with stunning visuals
const Welcome = ({ onNavigate }) => {
  return (
    <div className="welcome-container">
      <FloatingElements />
      
      <div className="hero-section">
        <div className="hero-background">
          <div className="bg-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge">
            <span>🏆 #1 Trainer Platform</span>
          </div>
          
          <h1 className="hero-title">
            Transform Your
            <span className="gradient-text"> Body</span>
            <br />
            Transform Your
            <span className="gradient-text"> Life</span>
          </h1>
          
          <p className="hero-description">
            Connect with world-class personal trainers, nutritionists, and fitness experts. 
            Your journey to the best version of yourself starts here.
          </p>
          
          <div className="hero-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={() => onNavigate('register')}
            >
              <span>Start Your Journey</span>
              <div className="btn-bg"></div>
            </button>
            <button 
              className="btn btn-ghost btn-large"
              onClick={() => onNavigate('login')}
            >
              <span>Sign In</span>
              <div className="btn-bg"></div>
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">
                <AnimatedCounter end={95} suffix="%" />
              </div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">
                <AnimatedCounter end={24} suffix="/7" />
              </div>
              <div className="stat-label">Support</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">
                <AnimatedCounter end={30} suffix=" Days" />
              </div>
              <div className="stat-label">Money Back</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="features-section">
        <div className="section-header">
          <h2>Why Choose TrainerLocator?</h2>
          <p>Experience the difference with our premium features</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>AI-Powered Matching</h3>
            <p>Our advanced algorithm matches you with the perfect trainer based on your goals and preferences</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Certified Professionals</h3>
            <p>All trainers are verified, certified, and continuously evaluated for quality assurance</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Smart Tracking</h3>
            <p>Track your progress with our intelligent analytics and personalized workout plans</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💎</div>
            <h3>Flexible Pricing</h3>
            <p>Choose from various packages and payment options that fit your budget and lifestyle</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Error Boundary Component
class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container" style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '0.5rem',
          margin: '1rem'
        }}>
          <h3>Something went wrong with the dashboard</h3>
          <p>Please try refreshing the page or contact support if the problem persists.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('welcome');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only check auth status once on app load
    const token = localStorage.getItem('token');
    if (token) {
      // Set the token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Try to get user data from localStorage first
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUser(user);
          setCurrentPage('dashboard');
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    console.log('Login successful for user:', userData);
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleRegister = (userData) => {
    console.log('Registration successful for user:', userData);
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentPage('welcome');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <div className="logo-icon">💪</div>
            <h2>TRAINERLOCATOR</h2>
          </div>
          <div className="loading-spinner large"></div>
          <p>Preparing your fitness journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navigation user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
      
      <main className="main-content">
        {currentPage === 'welcome' && (
          <Welcome onNavigate={handleNavigate} />
        )}
        {currentPage === 'login' && (
          <Login onLogin={handleLogin} onNavigate={handleNavigate} />
        )}
        {currentPage === 'register' && (
          <Register onRegister={handleRegister} onNavigate={handleNavigate} />
        )}
        {currentPage === 'dashboard' && user && user.role === 'trainer' && (
          <SimpleErrorBoundary>
            {console.log('Rendering TrainerDashboard for user:', user)}
            <TrainerDashboard user={user} />
          </SimpleErrorBoundary>
        )}
        {currentPage === 'dashboard' && user && user.role === 'user' && (
          <SimpleErrorBoundary>
            {console.log('Rendering UserDashboard for user:', user)}
            <UserDashboard user={user} />
          </SimpleErrorBoundary>
        )}
      </main>
    </div>
  );
}

export default App;