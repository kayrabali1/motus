const db = require('../db');
const workoutsCollection = db.collection('workouts');

// Calories estimate per rep for each exercise type
const CALORIES_PER_REP = {
  'pushups': 1.2,
  'squats': 0.5,
  'pullups': 2.0,
};

exports.logWorkout = async (req, res) => {
  try {
    const { exercise, reps, minutes } = req.body;
    const email = req.user.email;

    if (!exercise || reps === undefined) {
      return res.status(400).json({ error: 'Exercise type and rep count are required.' });
    }

    const calorieCoef = CALORIES_PER_REP[exercise] || 1.0;
    const calories = Math.round(reps * calorieCoef);
    const earnedMinutes = minutes || (reps * (exercise === 'pushups' ? 2 : exercise === 'pullups' ? 3 : 1));

    const newLog = {
      userId: email,
      exercise,
      reps: parseInt(reps, 10),
      minutes: parseInt(earnedMinutes, 10),
      calories,
      timestamp: new Date().toISOString(),
    };

    const docRef = await workoutsCollection.add(newLog);

    res.status(201).json({
      id: docRef.id,
      ...newLog
    });
  } catch (error) {
    console.error('LogWorkout error:', error);
    res.status(500).json({ error: 'Failed to record workout session.' });
  }
};

exports.getWorkouts = async (req, res) => {
  try {
    const email = req.user.email;
    const snapshot = await workoutsCollection
      .where('userId', '==', email)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('GetWorkouts error:', error);
    res.status(500).json({ error: 'Failed to fetch workouts.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const email = req.user.email;
    
    // Fetch all workouts for stats computation
    const snapshot = await workoutsCollection
      .where('userId', '==', email)
      .get();

    let totalReps = 0;
    let totalCalories = 0;
    let totalUnlocks = 0;
    let activityLogs = [];

    const todayStr = new Date().toISOString().split('T')[0];

    snapshot.forEach(doc => {
      const data = doc.data();
      const isToday = data.timestamp.startsWith(todayStr);
      
      if (isToday) {
        totalReps += data.reps;
        totalCalories += data.calories || 0;
        totalUnlocks += 1; // Each completed challenge counts as 1 unlock session
      }

      activityLogs.push({
        id: doc.id,
        exercise: data.exercise,
        reps: data.reps,
        timestamp: data.timestamp,
      });
    });

    // Sort activity logs by time descending
    activityLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.status(200).json({
      today: {
        reps: totalReps,
        calories: totalCalories,
        unlocks: totalUnlocks,
      },
      activityLogs: activityLogs.slice(0, 10), // Return last 10 activities
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats.' });
  }
};
