import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import MotusScreenTime from '../../modules/motus-screen-time/src/MotusScreenTimeModule';

export const EXERCISE_MULTIPLIERS: Record<string, number> = {
  'pushups': 2,
  'squats': 1,
  'pullups': 3,
  'jumping_jacks': 2,
  'burpees': 3,
  'high_knees': 1,
};

// We will replace this URL with the actual Cloud Run URL after deployment completes
export const API_BASE_URL = 'https://motus-backend-555323311848.us-central1.run.app';

interface User {
  name: string;
  email: string;
  proMember: boolean;
  avatarUrl?: string | null;
}

interface ActivityLog {
  id: string;
  exercise: string;
  reps: number;
  timestamp: string;
  minutes?: number;
  calories?: number;
  unlockedApp?: string | null;
}



interface MotusState {
  // App Config State
  selectedExercise: string;
  repCount: number;
  strictMode: boolean;
  lockExpirationTime: number | null;
  activeLockCount: number;
  
  // Notification State
  appRelockAlertEnabled: boolean;
  
  // Auth State
  token: string | null;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  
  // Stats State
  todayReps: number;
  todayCalories: number;
  todayUnlocks: number;
  activityLogs: ActivityLog[];
  weeklyCalories: { dayLabel: string; calories: number; date: string }[][];
  
  // App Settings Actions
  setExercise: (exercise: string) => void;
  setRepCount: (count: number) => void;
  setStrictMode: (enabled: boolean) => void;
  setLockExpiration: (timestamp: number | null) => void;
  setActiveLockCount: (count: number) => void;
  getEarnedMinutes: () => number;
  
  // Notification Actions
  setAppRelockAlertEnabled: (enabled: boolean) => void;
  
  // Auth Actions
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: (idToken: string, name?: string) => Promise<boolean>;
  signInWithApple: (identityToken: string, name?: string) => Promise<boolean>;
  requestResetCode: (email: string) => Promise<string | null>; // Returns code for test visibility
  resetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
  updateProfileName: (name: string) => Promise<boolean>;
  updateProfileAvatar: (base64Image: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setProMember: (isPro: boolean) => Promise<void>;
  clearAuthError: () => void;
  
  // Workout Actions
  logWorkoutSession: (exercise: string, reps: number) => Promise<void>;
  fetchStatsAndActivity: () => Promise<void>;
  
  loadState: () => Promise<void>;
}

export const useMotusStore = create<MotusState>((set, get) => ({
  // Defaults
  selectedExercise: 'pushups',
  repCount: 10,
  strictMode: false,
  lockExpirationTime: null,
  activeLockCount: 0,
  
  appRelockAlertEnabled: true,
  
  token: null,
  user: null,
  authLoading: false,
  authError: null,
  
  todayReps: 0,
  todayCalories: 0,
  todayUnlocks: 0,
  activityLogs: [],
  weeklyCalories: [],
  
  setExercise: (exercise) => {
    set({ selectedExercise: exercise });
    SecureStore.setItemAsync('motus_exercise', exercise);
  },
  
  setRepCount: (count) => {
    set({ repCount: count });
    SecureStore.setItemAsync('motus_reps', count.toString());
  },

  setStrictMode: (enabled) => {
    set({ strictMode: enabled });
    SecureStore.setItemAsync('motus_strict_mode', enabled ? 'true' : 'false');
  },

  setAppRelockAlertEnabled: (enabled) => {
    set({ appRelockAlertEnabled: enabled });
    SecureStore.setItemAsync('motus_app_relock_alert_enabled', enabled ? 'true' : 'false');
  },

  setLockExpiration: (timestamp) => {
    set({ lockExpirationTime: timestamp });
    if (timestamp) {
      SecureStore.setItemAsync('motus_expiration', timestamp.toString());
    } else {
      SecureStore.deleteItemAsync('motus_expiration');
    }
  },

  setActiveLockCount: (count) => {
    set({ activeLockCount: count });
  },

  getEarnedMinutes: () => {
    const { selectedExercise, repCount } = get();
    const multiplier = EXERCISE_MULTIPLIERS[selectedExercise] || 1;
    return repCount * multiplier;
  },
  
  // Auth Actions
  signUp: async (name, email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      
      set({ token: data.token, user: data.user, authLoading: false });
      await SecureStore.setItemAsync('motus_token', data.token);
      await SecureStore.setItemAsync('motus_user', JSON.stringify(data.user));
      try {
        MotusScreenTime.setProMemberStatus(data.user?.proMember || false);
      } catch (e) {
        console.log('Failed to sync pro status in signup', e);
      }
      
      // Load stats for new user
      await get().fetchStatsAndActivity();
      return true;
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Signup failed' });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      
      set({ token: data.token, user: data.user, authLoading: false });
      await SecureStore.setItemAsync('motus_token', data.token);
      await SecureStore.setItemAsync('motus_user', JSON.stringify(data.user));
      try {
        MotusScreenTime.setProMemberStatus(data.user?.proMember || false);
      } catch (e) {
        console.log('Failed to sync pro status in signin', e);
      }
      
      // Load stats for logging in user
      await get().fetchStatsAndActivity();
      return true;
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Signin failed' });
      return false;
    }
  },

  signInWithGoogle: async (idToken, name) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google authentication failed.');
      }
      
      set({ token: data.token, user: data.user, authLoading: false });
      await SecureStore.setItemAsync('motus_token', data.token);
      await SecureStore.setItemAsync('motus_user', JSON.stringify(data.user));
      try {
        MotusScreenTime.setProMemberStatus(data.user?.proMember || false);
      } catch (e) {
        console.log('Failed to sync pro status in google signin', e);
      }
      
      await get().fetchStatsAndActivity();
      return true;
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Google signin failed' });
      return false;
    }
  },

  signInWithApple: async (identityToken, name) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityToken, name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Apple authentication failed.');
      }
      
      set({ token: data.token, user: data.user, authLoading: false });
      await SecureStore.setItemAsync('motus_token', data.token);
      await SecureStore.setItemAsync('motus_user', JSON.stringify(data.user));
      try {
        MotusScreenTime.setProMemberStatus(data.user?.proMember || false);
      } catch (e) {
        console.log('Failed to sync pro status in apple signin', e);
      }
      
      await get().fetchStatsAndActivity();
      return true;
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Apple signin failed' });
      return false;
    }
  },

  requestResetCode: async (email) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request reset code.');
      }
      set({ authLoading: false });
      return data.resetCode || '123456';
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Forgot password request failed' });
      return null;
    }
  },

  resetPassword: async (email, code, newPassword) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      set({ authLoading: false });
      return true;
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Reset password failed' });
      return false;
    }
  },

  updateProfileName: async (name: string) => {
    const { token } = get();
    if (!token) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (response.ok) {
        set({ user: data });
        await SecureStore.setItemAsync('motus_user', JSON.stringify(data));
        return true;
      }
      return false;
    } catch (e) {
      console.log('Failed to update profile name', e);
      return false;
    }
  },

  updateProfileAvatar: async (base64Image: string) => {
    const { token } = get();
    if (!token) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatarUrl: base64Image }),
      });
      const data = await response.json();
      if (response.ok) {
        set({ user: data });
        await SecureStore.setItemAsync('motus_user', JSON.stringify(data));
        return true;
      }
      return false;
    } catch (e) {
      console.log('Failed to update profile avatar', e);
      return false;
    }
  },

  signOut: async () => {
    set({ 
      token: null, 
      user: null, 
      todayReps: 0, 
      todayCalories: 0, 
      todayUnlocks: 0, 
      activityLogs: [],
      weeklyCalories: []
    });
    await SecureStore.deleteItemAsync('motus_token');
    await SecureStore.deleteItemAsync('motus_user');
    await SecureStore.deleteItemAsync('motus_today_reps');
    await SecureStore.deleteItemAsync('motus_today_calories');
    await SecureStore.deleteItemAsync('motus_today_unlocks');
    await SecureStore.deleteItemAsync('motus_activity_logs');
    await SecureStore.deleteItemAsync('motus_weekly_calories');
    try {
      MotusScreenTime.setProMemberStatus(false);
    } catch (e) {
      console.log('Failed to reset native pro member status', e);
    }
  },

  setProMember: async (isPro) => {
    const user = get().user;
    if (user) {
      const updatedUser = { ...user, proMember: isPro };
      set({ user: updatedUser });
      await SecureStore.setItemAsync('motus_user', JSON.stringify(updatedUser));
    } else {
      const guestUser = { name: 'Guest User', email: 'guest@motus.fit', proMember: isPro };
      set({ user: guestUser });
      await SecureStore.setItemAsync('motus_user', JSON.stringify(guestUser));
    }
    try {
      MotusScreenTime.setProMemberStatus(isPro);
    } catch (e) {
      console.log('Failed to set native pro member status', e);
    }
  },

  clearAuthError: () => {
    set({ authError: null });
  },
  
  // Workout Actions
  logWorkoutSession: async (exercise, reps) => {
    const { token, getEarnedMinutes } = get();
    
    // 1. Calculate stats and perform local optimistic update
    const minutes = getEarnedMinutes();
    let unlockedApp: string | null = null;
    try {
      const isUnlock = await MotusScreenTime.hasPendingUnlock();
      if (isUnlock) {
        unlockedApp = 'Application Unlock';
      }
    } catch (e) {
      console.log('Failed to check pending unlock status', e);
    }

    const CALORIES_PER_REP: Record<string, number> = {
      'pushups': 0.4,
      'squats': 0.5,
      'pullups': 0.5,
      'jumping_jacks': 0.3,
      'burpees': 0.6,
      'high_knees': 0.2,
    };
    const calorieCoef = CALORIES_PER_REP[exercise] || 1.0;
    const caloriesBurned = Math.ceil(reps * calorieCoef);
    
    const newLog: ActivityLog = {
      id: `local-${Date.now()}`,
      exercise,
      reps,
      calories: caloriesBurned,
      minutes,
      unlockedApp,
      timestamp: new Date().toISOString(),
    };

    const updatedTodayReps = get().todayReps + reps;
    const updatedTodayCalories = get().todayCalories + caloriesBurned;
    const updatedTodayUnlocks = get().todayUnlocks + (unlockedApp ? 1 : 0);
    const updatedLogs = [newLog, ...get().activityLogs];

    // Pre-populate weekly calories array structure if empty/invalid to ensure immediate local update
    let updatedWeekly = [...get().weeklyCalories];
    if (updatedWeekly.length !== 3) {
      const currentMonday = new Date();
      const day = currentMonday.getDay();
      const diff = day === 0 ? 6 : day - 1;
      currentMonday.setDate(currentMonday.getDate() - diff);
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
      updatedWeekly = weeks;
    }

    // Add calories to the today's date slot in the weekly data structure
    if (updatedWeekly.length > 0) {
      const currentWeekIndex = updatedWeekly.length - 1;
      const currentWeek = [...updatedWeekly[currentWeekIndex]];
      const d = new Date();
      const todayDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayIndex = currentWeek.findIndex(d => d.date === todayDateStr);
      if (dayIndex !== -1) {
        currentWeek[dayIndex] = {
          ...currentWeek[dayIndex],
          calories: currentWeek[dayIndex].calories + caloriesBurned
        };
        updatedWeekly[currentWeekIndex] = currentWeek;
      }
    }

    // Set local state
    set({
      todayReps: updatedTodayReps,
      todayCalories: updatedTodayCalories,
      todayUnlocks: updatedTodayUnlocks,
      activityLogs: updatedLogs,
      weeklyCalories: updatedWeekly,
    });

    // Persist local state to SecureStore
    try {
      await SecureStore.setItemAsync('motus_today_reps', updatedTodayReps.toString());
      await SecureStore.setItemAsync('motus_today_calories', updatedTodayCalories.toString());
      await SecureStore.setItemAsync('motus_today_unlocks', updatedTodayUnlocks.toString());
      await SecureStore.setItemAsync('motus_activity_logs', JSON.stringify(updatedLogs));
      await SecureStore.setItemAsync('motus_weekly_calories', JSON.stringify(updatedWeekly));
      
      const d = new Date();
      const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await SecureStore.setItemAsync('motus_today_date', localDateStr);
    } catch (e) {
      console.log('Failed to save optimistic stats to SecureStore', e);
    }

    // 2. Sync with API if user is authenticated
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/workouts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ exercise, reps, minutes, unlockedApp }),
      });
      if (response.ok) {
        await get().fetchStatsAndActivity();
      }
    } catch (e) {
      console.log('Failed to log workout session to api', e);
    }
  },

  fetchStatsAndActivity: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const d = new Date();
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const timezoneOffset = d.getTimezoneOffset();

      const response = await fetch(`${API_BASE_URL}/api/workouts/stats?localDate=${localDate}&timezoneOffset=${timezoneOffset}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const logs = data.activityLogs || [];

        const now = new Date();
        const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // 1. Adjust weeklyCalories for timezone shifts using the activityLogs
        const adjustedWeekly = data.weeklyCalories ? JSON.parse(JSON.stringify(data.weeklyCalories)) : [];
        logs.forEach((log: any) => {
          const utcDateStr = log.timestamp.split('T')[0];
          const logDate = new Date(log.timestamp);
          const logLocalStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
          
          if (utcDateStr !== logLocalStr && adjustedWeekly.length > 0) {
            // Find and subtract from UTC day slot (where old backend placed it)
            for (let w = 0; w < adjustedWeekly.length; w++) {
              const utcDayObj = adjustedWeekly[w].find((item: any) => item.date === utcDateStr);
              if (utcDayObj) {
                utcDayObj.calories = Math.max(0, utcDayObj.calories - log.calories);
                break;
              }
            }
            // Find and add to local day slot (where it actually belongs)
            for (let w = 0; w < adjustedWeekly.length; w++) {
              const localDayObj = adjustedWeekly[w].find((item: any) => item.date === logLocalStr);
              if (localDayObj) {
                localDayObj.calories += log.calories;
                break;
              }
            }
          }
        });

        // 2. Base today's calories on the adjusted weeklyCalories slot for today to ensure perfect alignment
        let computedCalories = data.today?.calories ?? 0;
        if (adjustedWeekly.length > 0) {
          const currentWeekIndex = adjustedWeekly.length - 1;
          const todayObj = adjustedWeekly[currentWeekIndex].find((item: any) => item.date === localTodayStr);
          if (todayObj) {
            computedCalories = todayObj.calories;
          }
        }

        // 3. Adjust reps and unlocks based on timezone-shifted logs (to handle fallback to old backend stats)
        let computedReps = data.today?.reps ?? 0;
        let computedUnlocks = data.today?.unlocks ?? 0;
        logs.forEach((log: any) => {
          const utcDateStr = log.timestamp.split('T')[0];
          const logDate = new Date(log.timestamp);
          const logLocalStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
          
          if (utcDateStr !== logLocalStr) {
            if (logLocalStr === localTodayStr) {
              computedReps += log.reps || 0;
              if (log.unlockedApp) {
                computedUnlocks += 1;
              }
            } else if (utcDateStr === localTodayStr) {
              computedReps = Math.max(0, computedReps - (log.reps || 0));
              if (log.unlockedApp) {
                computedUnlocks = Math.max(0, computedUnlocks - 1);
              }
            }
          }
        });

        set({
          todayReps: computedReps,
          todayCalories: computedCalories,
          todayUnlocks: computedUnlocks,
          activityLogs: logs,
          weeklyCalories: adjustedWeekly,
        });

        await SecureStore.setItemAsync('motus_today_reps', computedReps.toString());
        await SecureStore.setItemAsync('motus_today_calories', computedCalories.toString());
        await SecureStore.setItemAsync('motus_today_unlocks', computedUnlocks.toString());
        await SecureStore.setItemAsync('motus_activity_logs', JSON.stringify(logs));
        await SecureStore.setItemAsync('motus_weekly_calories', JSON.stringify(adjustedWeekly));
        await SecureStore.setItemAsync('motus_today_date', localTodayStr);
      }
    } catch (e) {
      console.log('Failed to fetch stats from api', e);
    }
  },
  
  loadState: async () => {
    try {
      const exercise = await SecureStore.getItemAsync('motus_exercise');
      const count = await SecureStore.getItemAsync('motus_reps');
      const exp = await SecureStore.getItemAsync('motus_expiration');
      const strict = await SecureStore.getItemAsync('motus_strict_mode');
      
      const appRelockAlertVal = await SecureStore.getItemAsync('motus_app_relock_alert_enabled');
      
      const token = await SecureStore.getItemAsync('motus_token');
      const userStr = await SecureStore.getItemAsync('motus_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const d = new Date();
      const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cachedTodayDate = await SecureStore.getItemAsync('motus_today_date');
      const isSameDay = cachedTodayDate === localDateStr;

      const todayRepsStr = isSameDay ? await SecureStore.getItemAsync('motus_today_reps') : '0';
      const todayCaloriesStr = isSameDay ? await SecureStore.getItemAsync('motus_today_calories') : '0';
      const todayUnlocksStr = isSameDay ? await SecureStore.getItemAsync('motus_today_unlocks') : '0';
      
      if (!isSameDay) {
        await SecureStore.setItemAsync('motus_today_date', localDateStr);
        await SecureStore.setItemAsync('motus_today_reps', '0');
        await SecureStore.setItemAsync('motus_today_calories', '0');
        await SecureStore.setItemAsync('motus_today_unlocks', '0');
      }

      const activityLogsStr = await SecureStore.getItemAsync('motus_activity_logs');
      const weeklyCaloriesStr = await SecureStore.getItemAsync('motus_weekly_calories');
      
      let parsedLogs: ActivityLog[] = [];
      if (activityLogsStr) {
        try {
          parsedLogs = JSON.parse(activityLogsStr);
        } catch (e) {
          console.log('Failed to parse cached activity logs', e);
        }
      }

      let parsedWeekly: { dayLabel: string; calories: number; date: string }[][] = [];
      if (weeklyCaloriesStr) {
        try {
          parsedWeekly = JSON.parse(weeklyCaloriesStr);
        } catch (e) {
          console.log('Failed to parse cached weekly calories', e);
        }
      }

      set({
        selectedExercise: exercise || 'pushups',
        repCount: count ? parseInt(count, 10) : 10,
        strictMode: strict === 'true',
        lockExpirationTime: exp ? parseInt(exp, 10) : null,
        appRelockAlertEnabled: appRelockAlertVal !== 'false', // Default to true if not set
        token,
        user,
        todayReps: todayRepsStr ? parseInt(todayRepsStr, 10) : 0,
        todayCalories: todayCaloriesStr ? parseInt(todayCaloriesStr, 10) : 0,
        todayUnlocks: todayUnlocksStr ? parseInt(todayUnlocksStr, 10) : 0,
        activityLogs: parsedLogs,
        weeklyCalories: parsedWeekly,
      });

      try {
        MotusScreenTime.setProMemberStatus(user?.proMember || false);
      } catch (e) {
        console.log('Failed to sync pro status in loadState', e);
      }

      if (token) {
        // Sync stats
        get().fetchStatsAndActivity();
      }

      try {
        const activeLocks = await MotusScreenTime.getActiveLockCount();
        set({ activeLockCount: activeLocks });
      } catch (e) {
        console.log('Failed to fetch active lock count', e);
      }
    } catch (e) {
      console.log('Failed to load state', e);
    }
  },
}));
