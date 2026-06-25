import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const EXERCISE_MULTIPLIERS: Record<string, number> = {
  'pushups': 2,
  'squats': 1,
  'pullups': 3,
};

interface MotusState {
  selectedExercise: string;
  repCount: number;
  lockExpirationTime: number | null;
  activeLockCount: number;
  setExercise: (exercise: string) => void;
  setRepCount: (count: number) => void;
  setLockExpiration: (timestamp: number | null) => void;
  setActiveLockCount: (count: number) => void;
  getEarnedMinutes: () => number;
  loadState: () => Promise<void>;
}

export const useMotusStore = create<MotusState>((set, get) => ({
  selectedExercise: 'pushups',
  repCount: 10,
  lockExpirationTime: null,
  activeLockCount: 0,
  
  setExercise: (exercise) => {
    set({ selectedExercise: exercise });
    SecureStore.setItemAsync('motus_exercise', exercise);
  },
  
  setRepCount: (count) => {
    set({ repCount: count });
    SecureStore.setItemAsync('motus_reps', count.toString());
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
  
  loadState: async () => {
    try {
      const exercise = await SecureStore.getItemAsync('motus_exercise');
      const count = await SecureStore.getItemAsync('motus_reps');
      const exp = await SecureStore.getItemAsync('motus_expiration');
      
      set({
        selectedExercise: exercise || 'pushups',
        repCount: count ? parseInt(count, 10) : 10,
        lockExpirationTime: exp ? parseInt(exp, 10) : null
      });

      import('../../modules/motus-screen-time/src/MotusScreenTimeModule')
        .then((MotusScreenTime) => MotusScreenTime.default.getActiveLockCount())
        .then((count) => set({ activeLockCount: count }))
        .catch((e) => console.log('Failed to fetch active lock count', e));
    } catch (e) {
      console.log('Failed to load state', e);
    }
  },
}));
