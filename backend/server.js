require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authController = require('./controllers/authController');
const workoutController = require('./controllers/workoutController');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication Routes
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/signin', authController.signin);
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.post('/api/auth/reset-password', authController.resetPassword);
app.post('/api/auth/google', authController.googleLogin);
app.post('/api/auth/apple', authController.appleLogin);

// Protected Workout Routes
app.put('/api/users/profile', authMiddleware, authController.updateProfile);
app.post('/api/workouts', authMiddleware, workoutController.logWorkout);
app.get('/api/workouts', authMiddleware, workoutController.getWorkouts);
app.get('/api/workouts/stats', authMiddleware, workoutController.getStats);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Motus Backend running on port ${PORT}`);
});
