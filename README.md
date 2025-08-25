# 🏋️ TrainerLocator - Complete Fitness Platform

A modern, full-stack web application that connects fitness enthusiasts with certified personal trainers. Built with React, Node.js, and MongoDB.

## ✨ Features

### 🎯 Core Functionality
- **User Authentication**: Secure login/registration with JWT tokens
- **Role-Based Access**: Separate dashboards for users and trainers
- **Trainer Discovery**: Advanced search and filtering system
- **Session Booking**: Complete booking management system
- **Real-time Updates**: Socket.io integration for live notifications
- **Responsive Design**: Modern, mobile-first UI/UX

### 👥 User Features
- Browse and search trainers by specialization, location, and rating
- View detailed trainer profiles with reviews and certifications
- Book training sessions (single, package, or subscription)
- Track session history and progress
- Manage personal profile and preferences

### 🏆 Trainer Features
- Complete profile setup with specializations and services
- Availability management and scheduling
- Client session management
- Earnings tracking and analytics
- Review and rating system

### 🔧 Admin Features
- User management and role assignment
- Trainer verification system
- Platform analytics and statistics
- Content moderation tools

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **CSS3** - Custom styling with CSS variables
- **Axios** - HTTP client for API calls
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **Socket.io** - Real-time server
- **Multer** - File upload handling
- **Nodemailer** - Email services

### Security & Performance
- **Helmet** - Security headers
- **Rate Limiting** - API protection
- **Input Validation** - Data sanitization
- **CORS** - Cross-origin resource sharing
- **Bcrypt** - Password hashing

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **npm** or **yarn** package manager

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TrainerLocator
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
cd client
npm install
```

#### Backend Dependencies
```bash
cd server
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/trainerlocator

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Client URL
CLIENT_URL=http://localhost:3000

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 4. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Create database: `trainerlocator`

#### Option B: MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster and database
3. Get connection string and update `.env`

## 🚀 Running the Application

### 1. Start Backend Server
```bash
cd server
npm run dev
```

The server will start on `http://localhost:5000`

### 2. Start Frontend Development Server
```bash
cd client
npm run dev
```

The client will start on `http://localhost:3000`

### 3. Access the Application
Open your browser and navigate to `http://localhost:3000`

## 📱 Usage Guide

### For Users

1. **Registration/Login**
   - Create an account or sign in
   - Choose "I'm looking for a trainer" role

2. **Find Trainers**
   - Use search filters (specialization, location, rating)
   - Browse trainer profiles and reviews
   - View availability and pricing

3. **Book Sessions**
   - Select preferred session type and duration
   - Choose available time slots
   - Complete payment process

4. **Manage Sessions**
   - View upcoming and past sessions
   - Track progress and achievements
   - Rate and review trainers

### For Trainers

1. **Profile Setup**
   - Complete trainer profile with specializations
   - Set services, pricing, and availability
   - Upload certifications and achievements

2. **Client Management**
   - View and manage session requests
   - Track client progress and history
   - Manage availability and scheduling

3. **Business Analytics**
   - Monitor earnings and session statistics
   - Track client retention and ratings
   - View performance metrics

### For Administrators

1. **User Management**
   - Monitor user accounts and roles
   - Verify trainer profiles and certifications
   - Manage platform content

2. **Platform Analytics**
   - View user statistics and growth
   - Monitor session and booking metrics
   - Track revenue and performance

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Trainers
- `GET /api/trainers` - Get all trainers with filters
- `GET /api/trainers/:id` - Get specific trainer
- `POST /api/trainers` - Create trainer profile
- `PUT /api/trainers/:id` - Update trainer profile
- `POST /api/trainers/:id/reviews` - Add review

### Sessions
- `GET /api/sessions` - Get user sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id/status` - Update session status
- `DELETE /api/sessions/:id` - Cancel session

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id/status` - Update booking status
- `PUT /api/bookings/:id/payment` - Update payment status

### Admin
- `GET /api/admin/dashboard` - Admin statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/trainers` - Trainer management
- `PUT /api/admin/trainers/:id/verify` - Verify trainer

## 🎨 Customization

### Styling
- Modify CSS variables in `client/src/App.css`
- Update color schemes and themes
- Customize component layouts

### Features
- Add new user roles and permissions
- Implement additional payment gateways
- Integrate third-party fitness APIs
- Add video calling for virtual sessions

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd client
npm run build
# Deploy dist folder
```

### Backend (Heroku/Railway)
```bash
cd server
# Set environment variables
# Deploy to platform
```

### Database
- Use MongoDB Atlas for production
- Set up proper indexes for performance
- Configure backup and monitoring

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MongoDB service status
   - Verify connection string in `.env`
   - Ensure network access (for Atlas)

2. **Port Already in Use**
   - Change port in `.env` file
   - Kill existing processes on port

3. **CORS Errors**
   - Verify `CLIENT_URL` in `.env`
   - Check CORS configuration in server

4. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set
   - Check token expiration settings

### Debug Mode
Enable debug logging:
```bash
# Server
DEBUG=* npm run dev

# Client
# Check browser console for errors
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB for the robust database
- Express.js community for the web framework
- All contributors and users

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Made with ❤️ by the TrainerLocator Team**

Transform your fitness journey today! 💪 