const db = require('../db');
const workoutsCollection = db.collection('workouts');

// Calories estimate per rep for each exercise type
const CALORIES_PER_REP = {
  'pushups': 1.2,
  'squats': 0.5,
  'pullups': 2.0,
  'jumping_jacks': 0.8,
  'burpees': 2.5,
  'high_knees': 1.0,
};

exports.logWorkout = async (req, res) => {
  try {
    const { exercise, reps, minutes, unlockedApp } = req.body;
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
      unlockedApp: unlockedApp || null,
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

    // Calculate Monday-starting calendar weeks for 3 weeks (2 weeks ago, last week, current week)
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - diff);
    currentMonday.setHours(0, 0, 0, 0);

    const weeks = [];
    for (let w = 2; w >= 0; w--) {
      const weekMonday = new Date(currentMonday);
      weekMonday.setDate(currentMonday.getDate() - (w * 7));
      
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekMonday);
        d.setDate(weekMonday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
        weekDays.push({
          date: dateStr,
          dayLabel: dayLabel,
          calories: 0,
        });
      }
      weeks.push(weekDays);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    snapshot.forEach(doc => {
      const data = doc.data();
      const reps = data.reps || 0;
      const calorieCoef = CALORIES_PER_REP[data.exercise] || 1.0;
      const calories = data.calories || Math.round(reps * calorieCoef);

      const isToday = data.timestamp.startsWith(todayStr);
      if (isToday) {
        totalReps += reps;
        totalCalories += calories;
        totalUnlocks += 1; // Each completed challenge counts as 1 unlock session
      }

      // Aggregate calories by matching date string into the correct week
      const datePart = data.timestamp.split('T')[0];
      for (let w = 0; w < 3; w++) {
        const dayObj = weeks[w].find(item => item.date === datePart);
        if (dayObj) {
          dayObj.calories += calories;
          break;
        }
      }

      activityLogs.push({
        id: doc.id,
        exercise: data.exercise,
        reps: data.reps,
        timestamp: data.timestamp,
        minutes: data.minutes || 0,
        calories: calories,
        unlockedApp: data.unlockedApp || null,
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
      weeklyCalories: weeks,
      activityLogs: activityLogs.slice(0, 10), // Return last 10 activities
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats.' });
  }
};
