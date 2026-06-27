const db = require('../db');
const workoutsCollection = db.collection('workouts');

// Calories estimate per rep for each exercise type
const CALORIES_PER_REP = {
  'pushups': 0.4,
  'squats': 0.5,
  'pullups': 0.5,
  'jumping_jacks': 0.3,
  'burpees': 0.6,
  'high_knees': 0.2,
};

exports.logWorkout = async (req, res) => {
  try {
    const { exercise, reps, minutes, unlockedApp } = req.body;
    const email = req.user.email;

    if (!exercise || reps === undefined) {
      return res.status(400).json({ error: 'Exercise type and rep count are required.' });
    }

    const calorieCoef = CALORIES_PER_REP[exercise] || 1.0;
    const calories = Math.ceil(reps * calorieCoef);
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
    const timezoneOffset = parseInt(req.query.timezoneOffset || '0', 10);
    const localDate = req.query.localDate; // Expected format: YYYY-MM-DD
    
    // Fetch all workouts for stats computation
    const snapshot = await workoutsCollection
      .where('userId', '==', email)
      .get();

    let totalReps = 0;
    let totalCalories = 0;
    let totalUnlocks = 0;
    let activityLogs = [];

    // Base date for computing weeks relative to client local date
    let baseDate = new Date();
    if (localDate) {
      const parts = localDate.split('-');
      baseDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    } else {
      baseDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
    }
    
    const day = baseDate.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    
    const currentMonday = new Date(baseDate);
    currentMonday.setUTCDate(baseDate.getUTCDate() - diff);

    const weeks = [];
    for (let w = 2; w >= 0; w--) {
      const weekMonday = new Date(currentMonday);
      weekMonday.setUTCDate(currentMonday.getUTCDate() - (w * 7));
      
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekMonday);
        d.setUTCDate(weekMonday.getUTCDate() + i);
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).charAt(0);
        weekDays.push({
          date: dateStr,
          dayLabel: dayLabel,
          calories: 0,
        });
      }
      weeks.push(weekDays);
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const reps = data.reps || 0;
      const calorieCoef = CALORIES_PER_REP[data.exercise] || 1.0;
      const calories = data.calories || Math.ceil(reps * calorieCoef);

      // Convert timestamp to user's local date string
      const logDate = new Date(data.timestamp);
      const userLocalTime = new Date(logDate.getTime() - (timezoneOffset * 60 * 1000));
      const logLocalDateStr = `${userLocalTime.getUTCFullYear()}-${String(userLocalTime.getUTCMonth() + 1).padStart(2, '0')}-${String(userLocalTime.getUTCDate()).padStart(2, '0')}`;

      // Check if this log is "today" in local timezone
      const isToday = localDate ? (logLocalDateStr === localDate) : (data.timestamp.split('T')[0] === new Date().toISOString().split('T')[0]);
      if (isToday) {
        totalReps += reps;
        totalCalories += calories;
        totalUnlocks += 1;
      }

      // Aggregate calories by matching date string into the correct week
      for (let w = 0; w < 3; w++) {
        const dayObj = weeks[w].find(item => item.date === logLocalDateStr);
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
      activityLogs: activityLogs.slice(0, 10),
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats.' });
  }
};
