import { useMotusStore, EXERCISE_MULTIPLIERS } from '../useStore';
import * as SecureStore from 'expo-secure-store';
import MotusScreenTime from '../../../modules/motus-screen-time/src/MotusScreenTimeModule';



// Helper to mock a fetch response
const mockFetchResponse = (ok: boolean, status: number, data: any) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(data),
    })
  );
};

// Helper to mock a fetch network failure
const mockFetchError = (errorMessage: string) => {
  return jest.fn().mockImplementation(() =>
    Promise.reject(new Error(errorMessage))
  );
};

describe('useMotusStore Store Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
    
    // Reset Zustand store state
    useMotusStore.setState({
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
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // Settings Actions
  it('should set selected exercise and persist to SecureStore', () => {
    useMotusStore.getState().setExercise('squats');
    expect(useMotusStore.getState().selectedExercise).toBe('squats');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_exercise', 'squats');
  });

  it('should set rep count and persist to SecureStore', () => {
    useMotusStore.getState().setRepCount(25);
    expect(useMotusStore.getState().repCount).toBe(25);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_reps', '25');
  });

  it('should set strict mode and persist to SecureStore', () => {
    useMotusStore.getState().setStrictMode(true);
    expect(useMotusStore.getState().strictMode).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_strict_mode', 'true');

    useMotusStore.getState().setStrictMode(false);
    expect(useMotusStore.getState().strictMode).toBe(false);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_strict_mode', 'false');
  });

  it('should set lock expiration and persist or delete in SecureStore', () => {
    const timestamp = 1782417756124;
    useMotusStore.getState().setLockExpiration(timestamp);
    expect(useMotusStore.getState().lockExpirationTime).toBe(timestamp);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_expiration', timestamp.toString());

    useMotusStore.getState().setLockExpiration(null);
    expect(useMotusStore.getState().lockExpirationTime).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_expiration');
  });

  it('should set active lock count', () => {
    useMotusStore.getState().setActiveLockCount(5);
    expect(useMotusStore.getState().activeLockCount).toBe(5);
  });

  it('should compute earned minutes correctly', () => {
    useMotusStore.setState({ selectedExercise: 'pushups', repCount: 10 });
    expect(useMotusStore.getState().getEarnedMinutes()).toBe(20); // 10 * 2

    useMotusStore.setState({ selectedExercise: 'pullups', repCount: 5 });
    expect(useMotusStore.getState().getEarnedMinutes()).toBe(15); // 5 * 3

    useMotusStore.setState({ selectedExercise: 'squats', repCount: 30 });
    expect(useMotusStore.getState().getEarnedMinutes()).toBe(30); // 30 * 1

    useMotusStore.setState({ selectedExercise: 'unknown', repCount: 15 });
    expect(useMotusStore.getState().getEarnedMinutes()).toBe(15); // 15 * 1 (fallback)
  });

  // Auth: Sign Up
  it('should signup successfully and set state/SecureStore', async () => {
    const mockUser = { name: 'Kayra', email: 'kayra@fit.com', proMember: true };
    global.fetch = mockFetchResponse(true, 201, { token: 'mock-jwt-token', user: mockUser });

    // Mock successful stats fetch after signup
    const statsRes = { today: { reps: 0, calories: 0, unlocks: 0 }, activityLogs: [] };
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'mock-jwt-token', user: mockUser }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(statsRes) }));

    const success = await useMotusStore.getState().signUp('Kayra', 'kayra@fit.com', 'pass123');
    
    expect(success).toBe(true);
    expect(useMotusStore.getState().token).toBe('mock-jwt-token');
    expect(useMotusStore.getState().user).toEqual(mockUser);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_token', 'mock-jwt-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_user', JSON.stringify(mockUser));
  });

  it('should handle signup server error correctly', async () => {
    global.fetch = mockFetchResponse(false, 400, { error: 'Email already exists.' });

    const success = await useMotusStore.getState().signUp('Kayra', 'kayra@fit.com', 'pass123');
    
    expect(success).toBe(false);
    expect(useMotusStore.getState().token).toBeNull();
    expect(useMotusStore.getState().authError).toBe('Email already exists.');
  });

  it('should handle signup network failure correctly', async () => {
    global.fetch = mockFetchError('Network Error');

    const success = await useMotusStore.getState().signUp('Kayra', 'kayra@fit.com', 'pass123');
    
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Network Error');
  });

  // Auth: Sign In
  it('should signin successfully and set state/SecureStore', async () => {
    const mockUser = { name: 'Kayra', email: 'kayra@fit.com', proMember: true };
    const todayStr = new Date().toISOString();
    const statsRes = { 
      today: { reps: 50, calories: 60, unlocks: 2 }, 
      activityLogs: [
        { id: '1', exercise: 'pushups', reps: 50, timestamp: todayStr, calories: 60, unlockedApp: 'app' }
      ] 
    };
    
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'mock-jwt-token', user: mockUser }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(statsRes) }));

    const success = await useMotusStore.getState().signIn('kayra@fit.com', 'pass123');
    
    expect(success).toBe(true);
    expect(useMotusStore.getState().token).toBe('mock-jwt-token');
    expect(useMotusStore.getState().user).toEqual(mockUser);
    expect(useMotusStore.getState().todayReps).toBe(50);
  });

  it('should handle signin server error', async () => {
    global.fetch = mockFetchResponse(false, 401, { error: 'Invalid credentials.' });

    const success = await useMotusStore.getState().signIn('kayra@fit.com', 'pass123');
    
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Invalid credentials.');
  });

  it('should handle signin network failure', async () => {
    global.fetch = mockFetchError('Timeout');

    const success = await useMotusStore.getState().signIn('kayra@fit.com', 'pass123');
    
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Timeout');
  });

  // Auth: Forgot Password
  it('should request reset code successfully', async () => {
    global.fetch = mockFetchResponse(true, 200, { resetCode: '999888' });

    const code = await useMotusStore.getState().requestResetCode('test@fit.com');
    expect(code).toBe('999888');
  });

  it('should fallback to default reset code if not returned but response is ok', async () => {
    global.fetch = mockFetchResponse(true, 200, {});

    const code = await useMotusStore.getState().requestResetCode('test@fit.com');
    expect(code).toBe('123456');
  });

  it('should handle forgot password server error', async () => {
    global.fetch = mockFetchResponse(false, 404, { error: 'User not found.' });

    const code = await useMotusStore.getState().requestResetCode('test@fit.com');
    expect(code).toBeNull();
    expect(useMotusStore.getState().authError).toBe('User not found.');
  });

  it('should handle forgot password network failure', async () => {
    global.fetch = mockFetchError('DNS error');

    const code = await useMotusStore.getState().requestResetCode('test@fit.com');
    expect(code).toBeNull();
    expect(useMotusStore.getState().authError).toBe('DNS error');
  });

  // Auth: Reset Password
  it('should reset password successfully', async () => {
    global.fetch = mockFetchResponse(true, 200, { message: 'Success' });

    const success = await useMotusStore.getState().resetPassword('test@fit.com', '999888', 'newpass123');
    expect(success).toBe(true);
  });

  it('should handle reset password server error', async () => {
    global.fetch = mockFetchResponse(false, 400, { error: 'Invalid reset code.' });

    const success = await useMotusStore.getState().resetPassword('test@fit.com', '999888', 'newpass123');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Invalid reset code.');
  });

  it('should handle reset password network failure', async () => {
    global.fetch = mockFetchError('Connection lost');

    const success = await useMotusStore.getState().resetPassword('test@fit.com', '999888', 'newpass123');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Connection lost');
  });

  // Auth: Update Name
  it('should update profile name successfully and set secure store', async () => {
    useMotusStore.setState({ token: 'jwt-token', user: { name: 'Old', email: 'a@a.com', proMember: true } });
    global.fetch = mockFetchResponse(true, 200, { name: 'NewName', email: 'a@a.com', proMember: true });

    const success = await useMotusStore.getState().updateProfileName('NewName');
    expect(success).toBe(true);
    expect(useMotusStore.getState().user?.name).toBe('NewName');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_user', JSON.stringify({ name: 'NewName', email: 'a@a.com', proMember: true }));
  });

  it('should handle update profile name server error', async () => {
    useMotusStore.setState({ token: 'jwt-token', user: { name: 'Old', email: 'a@a.com', proMember: true } });
    global.fetch = mockFetchResponse(false, 400, { error: 'Invalid name' });

    const success = await useMotusStore.getState().updateProfileName('NewName');
    expect(success).toBe(false);
    expect(useMotusStore.getState().user?.name).toBe('Old');
  });

  it('should handle update profile name network failure', async () => {
    useMotusStore.setState({ token: 'jwt-token', user: { name: 'Old', email: 'a@a.com', proMember: true } });
    global.fetch = mockFetchError('Network down');

    const success = await useMotusStore.getState().updateProfileName('NewName');
    expect(success).toBe(false);
  });

  it('should reject update profile if no token is present', async () => {
    useMotusStore.setState({ token: null });
    const success = await useMotusStore.getState().updateProfileName('NewName');
    expect(success).toBe(false);
  });

  // Auth: Sign Out & Clear Error
  it('should clear token, stats, and delete secure store values on signout', async () => {
    useMotusStore.setState({
      token: 'jwt-token',
      user: { name: 'K', email: 'k@k.com', proMember: true },
      todayReps: 10,
      todayCalories: 15,
      todayUnlocks: 1,
      activityLogs: [{ id: '1', exercise: 'pushups', reps: 10, timestamp: '2026-06-25T15:00:00Z' }],
    });

    await useMotusStore.getState().signOut();

    const state = useMotusStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.todayReps).toBe(0);
    expect(state.todayCalories).toBe(0);
    expect(state.todayUnlocks).toBe(0);
    expect(state.activityLogs).toHaveLength(0);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_user');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_today_reps');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_today_calories');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_today_unlocks');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('motus_activity_logs');
  });

  it('should clear auth errors', () => {
    useMotusStore.setState({ authError: 'Some error' });
    useMotusStore.getState().clearAuthError();
    expect(useMotusStore.getState().authError).toBeNull();
  });

  // Workouts: Log Workout Session
  it('should log workout session and fetch updated stats', async () => {
    useMotusStore.setState({ token: 'jwt-token', repCount: 15, selectedExercise: 'pushups' });
    
    const todayStr = new Date().toISOString();
    const statsRes = { 
      today: { reps: 30, calories: 36, unlocks: 2 }, 
      activityLogs: [
        { id: '1', exercise: 'pushups', reps: 30, timestamp: todayStr, calories: 36, unlockedApp: 'app' }
      ] 
    };
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'workout-1' }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(statsRes) }));

    await useMotusStore.getState().logWorkoutSession('pushups', 15);
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(useMotusStore.getState().todayReps).toBe(30);
  });

  it('should reject log workout if no token is present', async () => {
    useMotusStore.setState({ token: null });
    global.fetch = jest.fn();

    await useMotusStore.getState().logWorkoutSession('pushups', 15);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle log workout network failure gracefully', async () => {
    useMotusStore.setState({ token: 'jwt-token', repCount: 10, selectedExercise: 'pushups' });
    global.fetch = mockFetchError('Connection timeout');

    await expect(useMotusStore.getState().logWorkoutSession('pushups', 10)).resolves.not.toThrow();
  });

  // Workouts: Fetch Stats
  it('should fetch stats and update state', async () => {
    useMotusStore.setState({ token: 'jwt-token' });
    const todayStr = new Date().toISOString();
    const statsRes = {
      today: { reps: 100, calories: 120, unlocks: 4 },
      weeklyCalories: [[{ date: '2026-06-25', dayLabel: 'T', calories: 10 }]],
      activityLogs: [
        { id: '1', exercise: 'pushups', reps: 40, timestamp: todayStr, calories: 50, unlockedApp: 'app1' },
        { id: '2', exercise: 'pushups', reps: 30, timestamp: todayStr, calories: 30, unlockedApp: 'app2' },
        { id: '3', exercise: 'pushups', reps: 20, timestamp: todayStr, calories: 30, unlockedApp: 'app3' },
        { id: '4', exercise: 'pushups', reps: 10, timestamp: todayStr, calories: 10, unlockedApp: 'app4' },
      ]
    };
    global.fetch = mockFetchResponse(true, 200, statsRes);

    await useMotusStore.getState().fetchStatsAndActivity();

    const state = useMotusStore.getState();
    expect(state.todayReps).toBe(100);
    expect(state.todayCalories).toBe(120);
    expect(state.todayUnlocks).toBe(4);
    expect(state.activityLogs).toHaveLength(4);
    expect(state.weeklyCalories).toEqual(statsRes.weeklyCalories);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_today_reps', '100');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_today_calories', '120');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_today_unlocks', '4');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_activity_logs', JSON.stringify(statsRes.activityLogs));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_weekly_calories', JSON.stringify(statsRes.weeklyCalories));
  });

  it('should reject fetch stats if no token is present', async () => {
    useMotusStore.setState({ token: null });
    global.fetch = jest.fn();

    await useMotusStore.getState().fetchStatsAndActivity();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch stats network failure gracefully', async () => {
    useMotusStore.setState({ token: 'jwt-token' });
    global.fetch = mockFetchError('Timeout');

    await expect(useMotusStore.getState().fetchStatsAndActivity()).resolves.not.toThrow();
  });

  // Load State
  it('should load initial configurations, token, user profile, and active lock count', async () => {
    const mockUser = { name: 'Test User', email: 't@t.com', proMember: true };
    const mockLogs = [{ id: '1', exercise: 'pushups', reps: 10, timestamp: '2026-06-25T15:00:00Z' }];
    const mockWeekly = [[{ date: '2026-06-25', dayLabel: 'T', calories: 10 }]];
    (SecureStore.getItemAsync as jest.Mock)
      .mockImplementation((key) => {
        if (key === 'motus_exercise') return Promise.resolve('pullups');
        if (key === 'motus_reps') return Promise.resolve('20');
        if (key === 'motus_strict_mode') return Promise.resolve('true');
        if (key === 'motus_expiration') return Promise.resolve('1782417756124');
        if (key === 'motus_token') return Promise.resolve(null);
        if (key === 'motus_user') return Promise.resolve(JSON.stringify(mockUser));
        if (key === 'motus_today_reps') return Promise.resolve('45');
        if (key === 'motus_today_calories') return Promise.resolve('54');
        if (key === 'motus_today_unlocks') return Promise.resolve('2');
        if (key === 'motus_activity_logs') return Promise.resolve(JSON.stringify(mockLogs));
        if (key === 'motus_weekly_calories') return Promise.resolve(JSON.stringify(mockWeekly));
        if (key === 'motus_today_date') {
          const d = new Date();
          return Promise.resolve(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
        return Promise.resolve(null);
      });

    await useMotusStore.getState().loadState();

    const state = useMotusStore.getState();
    expect(state.selectedExercise).toBe('pullups');
    expect(state.repCount).toBe(20);
    expect(state.strictMode).toBe(true);
    expect(state.lockExpirationTime).toBe(1782417756124);
    expect(state.token).toBeNull();
    expect(state.user).toEqual(mockUser);
    expect(state.todayReps).toBe(45);
    expect(state.todayCalories).toBe(54);
    expect(state.todayUnlocks).toBe(2);
    expect(state.activityLogs).toEqual(mockLogs);
    expect(state.weeklyCalories).toEqual(mockWeekly);
  });

  it('should handle loadState exceptions and set defaults', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore failure'));

    await useMotusStore.getState().loadState();

    const state = useMotusStore.getState();
    expect(state.selectedExercise).toBe('pushups'); // fallback default
    expect(state.repCount).toBe(10);
    expect(state.token).toBeNull();
  });

  it('should handle getActiveLockCount exception during loadState', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    jest.spyOn(MotusScreenTime, 'getActiveLockCount').mockRejectedValueOnce(new Error('Native Error'));

    await useMotusStore.getState().loadState();
    
    // Check that lock count remains default (0)
    expect(useMotusStore.getState().activeLockCount).toBe(0);
  });

  it('should load state with default fallbacks when SecureStore returns null', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    await useMotusStore.getState().loadState();

    const state = useMotusStore.getState();
    expect(state.selectedExercise).toBe('pushups');
    expect(state.repCount).toBe(10);
    expect(state.strictMode).toBe(false);
    expect(state.lockExpirationTime).toBeNull();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should handle signup network failure without error message', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject({}));
    const success = await useMotusStore.getState().signUp('Kayra', 'kayra@fit.com', 'pass123');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Signup failed');
  });

  it('should handle signin network failure without error message', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject({}));
    const success = await useMotusStore.getState().signIn('kayra@fit.com', 'pass123');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Signin failed');
  });

  it('should handle forgot password network failure without error message', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject({}));
    const code = await useMotusStore.getState().requestResetCode('test@fit.com');
    expect(code).toBeNull();
    expect(useMotusStore.getState().authError).toBe('Forgot password request failed');
  });

  it('should handle reset password network failure without error message', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject({}));
    const success = await useMotusStore.getState().resetPassword('test@fit.com', '123456', 'newpass');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Reset password failed');
  });

  it('should handle signup server error without error field', async () => {
    global.fetch = mockFetchResponse(false, 400, {});
    const success = await useMotusStore.getState().signUp('Kayra', 'kayra@fit.com', 'pass123');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Registration failed.');
  });

  it('should handle signin server error without error field', async () => {
    global.fetch = mockFetchResponse(false, 401, {});
    const success = await useMotusStore.getState().signIn('kayra@fit.com', 'pass123');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Authentication failed.');
  });

  it('should handle forgot password server error without error field', async () => {
    global.fetch = mockFetchResponse(false, 404, {});
    const code = await useMotusStore.getState().requestResetCode('test@fit.com');
    expect(code).toBeNull();
    expect(useMotusStore.getState().authError).toBe('Failed to request reset code.');
  });

  it('should handle reset password server error without error field', async () => {
    global.fetch = mockFetchResponse(false, 400, {});
    const success = await useMotusStore.getState().resetPassword('test@fit.com', '123456', 'newpass');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Failed to reset password.');
  });

  it('should handle log workout session API failure status', async () => {
    useMotusStore.setState({ token: 'jwt-token', repCount: 10, selectedExercise: 'pushups' });
    global.fetch = mockFetchResponse(false, 500, { error: 'Internal Error' });

    await expect(useMotusStore.getState().logWorkoutSession('pushups', 10)).resolves.not.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch stats API failure status', async () => {
    useMotusStore.setState({ token: 'jwt-token' });
    global.fetch = mockFetchResponse(false, 403, { error: 'Forbidden' });

    await expect(useMotusStore.getState().fetchStatsAndActivity()).resolves.not.toThrow();
    expect(useMotusStore.getState().todayReps).toBe(0);
  });

  // Auth: Google Sign-in
  it('should signin with Google successfully and set state/SecureStore', async () => {
    const mockUser = { name: 'Google User', email: 'google@fit.com', proMember: true };
    const statsRes = { today: { reps: 0, calories: 0, unlocks: 0 }, activityLogs: [] };
    
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'mock-jwt-token', user: mockUser }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(statsRes) }));

    const success = await useMotusStore.getState().signInWithGoogle('google-id-token', 'Google User');
    
    expect(success).toBe(true);
    expect(useMotusStore.getState().token).toBe('mock-jwt-token');
    expect(useMotusStore.getState().user).toEqual(mockUser);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_token', 'mock-jwt-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_user', JSON.stringify(mockUser));
  });

  it('should handle Google signin server error and network failure', async () => {
    global.fetch = mockFetchResponse(false, 400, { error: 'Invalid Google token.' });
    let success = await useMotusStore.getState().signInWithGoogle('google-id-token');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Invalid Google token.');

    global.fetch = mockFetchResponse(false, 400, {});
    success = await useMotusStore.getState().signInWithGoogle('google-id-token');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Google authentication failed.');

    global.fetch = mockFetchError('Network down');
    success = await useMotusStore.getState().signInWithGoogle('google-id-token');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Network down');
  });

  // Auth: Apple Sign-in
  it('should signin with Apple successfully and set state/SecureStore', async () => {
    const mockUser = { name: 'Apple User', email: 'apple@fit.com', proMember: true };
    const statsRes = { today: { reps: 0, calories: 0, unlocks: 0 }, activityLogs: [] };
    
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ token: 'mock-jwt-token', user: mockUser }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(statsRes) }));

    const success = await useMotusStore.getState().signInWithApple('apple-identity-token', 'Apple User');
    
    expect(success).toBe(true);
    expect(useMotusStore.getState().token).toBe('mock-jwt-token');
    expect(useMotusStore.getState().user).toEqual(mockUser);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_token', 'mock-jwt-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_user', JSON.stringify(mockUser));
  });

  it('should handle Apple signin server error and network failure', async () => {
    global.fetch = mockFetchResponse(false, 400, { error: 'Invalid Apple token.' });
    let success = await useMotusStore.getState().signInWithApple('apple-identity-token');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Invalid Apple token.');

    global.fetch = mockFetchResponse(false, 400, {});
    success = await useMotusStore.getState().signInWithApple('apple-identity-token');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Apple authentication failed.');

    global.fetch = mockFetchError('Network down');
    success = await useMotusStore.getState().signInWithApple('apple-identity-token');
    expect(success).toBe(false);
    expect(useMotusStore.getState().authError).toBe('Network down');
  });

  // Additional Coverage Tests
  it('should set app relock alert enabled', () => {
    useMotusStore.getState().setAppRelockAlertEnabled(false);
    expect(useMotusStore.getState().appRelockAlertEnabled).toBe(false);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('motus_app_relock_alert_enabled', 'false');
  });

  it('should handle hasPendingUnlock error during logWorkoutSession', async () => {
    useMotusStore.setState({ token: 'jwt-token', repCount: 10, selectedExercise: 'pushups' });
    MotusScreenTime.hasPendingUnlock.mockRejectedValueOnce(new Error('ScreenTime crash'));
    global.fetch = mockFetchResponse(true, 201, { id: '1' });
    
    await expect(useMotusStore.getState().logWorkoutSession('pushups', 10)).resolves.not.toThrow();
  });

  it('should update existing day in weeklyCalories during logWorkoutSession', async () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const weeklyData = [[{ dayLabel: 'Today', calories: 100, date: todayStr }]];
    useMotusStore.setState({ 
      token: 'jwt-token', 
      repCount: 10, 
      selectedExercise: 'pushups', 
      weeklyCalories: weeklyData 
    });
    
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: '1' }) }))
      .mockImplementationOnce(() => Promise.resolve({ 
        ok: true, 
        json: () => Promise.resolve({ 
          weeklyCalories: [[{ dayLabel: 'Today', calories: 104, date: todayStr }]], 
          activityLogs: [] 
        }) 
      }));

    await useMotusStore.getState().logWorkoutSession('pushups', 10);
    expect(useMotusStore.getState().weeklyCalories[0][0].calories).toBe(104); // 100 + 10 * 0.4
  });

  it('should handle SecureStore failure during logWorkoutSession', async () => {
    useMotusStore.setState({ token: 'jwt-token', repCount: 10, selectedExercise: 'pushups' });
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('SecureStore disk full'));
    global.fetch = mockFetchResponse(true, 201, { id: '1' });

    await expect(useMotusStore.getState().logWorkoutSession('pushups', 10)).resolves.not.toThrow();
  });

  it('should adjust stats when UTC date is different from local log date', async () => {
    useMotusStore.setState({ token: 'jwt-token' });
    const localDateStr = '2026-06-28';
    const utcDateStr = '2026-06-27';
    
    const weeklyData = [
      [
        { dayLabel: 'Sat', calories: 100, date: utcDateStr },
        { dayLabel: 'Sun', calories: 200, date: localDateStr }
      ]
    ];
    
    const statsRes = {
      today: { reps: 10, calories: 20, unlocks: 1 },
      weeklyCalories: weeklyData,
      activityLogs: [
        {
          id: '1',
          exercise: 'pushups',
          reps: 10,
          timestamp: '2026-06-27T23:30:00Z', // UTC 27th, but local is 28th
          calories: 20
        }
      ]
    };
    
    global.fetch = mockFetchResponse(true, 200, statsRes);
    useMotusStore.setState({ weeklyCalories: weeklyData });
    
    await useMotusStore.getState().fetchStatsAndActivity();
    expect(useMotusStore.getState().weeklyCalories[0][0].calories).toBe(80);
    expect(useMotusStore.getState().weeklyCalories[0][1].calories).toBe(220);
  });

  it('should handle JSON parsing errors in loadState', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === 'motus_activity_logs') return Promise.resolve('invalid-json');
      if (key === 'motus_weekly_calories') return Promise.resolve('invalid-json');
      return Promise.resolve(null);
    });
    
    await expect(useMotusStore.getState().loadState()).resolves.not.toThrow();
    expect(useMotusStore.getState().activityLogs).toEqual([]);
    expect(useMotusStore.getState().weeklyCalories).toEqual([]);
  });

  it('should sync stats on loadState if token is present', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === 'motus_token') return Promise.resolve('stored-token');
      return Promise.resolve(null);
    });
    const spyFetch = jest.spyOn(useMotusStore.getState(), 'fetchStatsAndActivity').mockResolvedValue();

    await useMotusStore.getState().loadState();
    expect(spyFetch).toHaveBeenCalled();
    spyFetch.mockRestore();
  });
});

