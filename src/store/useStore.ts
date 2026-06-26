import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import MotusScreenTime from '../../modules/motus-screen-time/src/MotusScreenTimeModule';

export const EXERCISE_MULTIPLIERS: Record<string, number> = {
  'pushups': 2,
  'squats': 1,
  'pullups': 3,
};

// We will replace this URL with the actual Cloud Run URL after deployment completes
export const API_BASE_URL = 'https://motus-backend-555323311848.us-central1.run.app';

interface User {
  name: string;
  email: string;
  proMember: boolean;
}

interface ActivityLog {
  id: string;
  exercise: string;
  reps: number;
  timestamp: string;
}

interface MotusState {
  // App Config State
  selectedExercise: string;
  repCount: number;
  strictMode: boolean;
  lockExpirationTime: number | null;
  activeLockCount: number;
  
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
  
  // App Settings Actions
  setExercise: (exercise: string) => void;
  setRepCount: (count: number) => void;
  setStrictMode: (enabled: boolean) => void;
  setLockExpiration: (timestamp: number | null) => void;
  setActiveLockCount: (count: number) => void;
  getEarnedMinutes: () => number;
  
  // Auth Actions
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  requestResetCode: (email: string) => Promise<string | null>; // Returns code for test visibility
  resetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
  updateProfileName: (name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
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
  
  token: null,
  user: null,
  authLoading: false,
  authError: null,
  
  todayReps: 0,
  todayCalories: 0,
  todayUnlocks: 0,
  activityLogs: [],
  
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
      
      // Load stats for logging in user
      await get().fetchStatsAndActivity();
      return true;
    } catch (e: any) {
      set({ authLoading: false, authError: e.message || 'Signin failed' });
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

  signOut: async () => {
    set({ 
      token: null, 
      user: null, 
      todayReps: 0, 
      todayCalories: 0, 
      todayUnlocks: 0, 
      activityLogs: [] 
    });
    await SecureStore.deleteItemAsync('motus_token');
    await SecureStore.deleteItemAsync('motus_user');
  },

  clearAuthError: () => {
    set({ authError: null });
  },
  
  // Workout Actions
  logWorkoutSession: async (exercise, reps) => {
    const { token, getEarnedMinutes } = get();
    if (!token) return;
    
    try {
      const minutes = getEarnedMinutes();
      const response = await fetch(`${API_BASE_URL}/api/workouts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ exercise, reps, minutes }),
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
      const response = await fetch(`${API_BASE_URL}/api/workouts/stats`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        set({
          todayReps: data.today.reps,
          todayCalories: data.today.calories,
          todayUnlocks: data.today.unlocks,
          activityLogs: data.activityLogs,
        });
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
      
      const token = await SecureStore.getItemAsync('motus_token');
      const userStr = await SecureStore.getItemAsync('motus_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      set({
        selectedExercise: exercise || 'pushups',
        repCount: count ? parseInt(count, 10) : 10,
        strictMode: strict === 'true',
        lockExpirationTime: exp ? parseInt(exp, 10) : null,
        token,
        user,
      });

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
