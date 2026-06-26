import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions, 
  Keyboard, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import { useMotusStore } from '../store/useStore';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const router = useRouter();
  const { signUp, signIn, requestResetCode, resetPassword, authLoading, authError, clearAuthError, token } = useMotusStore();

  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status and focused input tracking
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null); // For developer testing visibility

  useEffect(() => {
    // If already logged in, redirect immediately
    if (token) {
      router.replace('/(tabs)');
    }
  }, [token]);

  useEffect(() => {
    // Clear errors when switching modes
    clearAuthError();
    setLocalError(null);
    setSuccessMessage(null);
    setDevCode(null);
  }, [isLogin, forgotMode, resetMode]);

  const handleAuth = async () => {
    Keyboard.dismiss();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email) {
      setLocalError('Email is required.');
      return;
    }

    if (isLogin) {
      if (!password) {
        setLocalError('Password is required.');
        return;
      }
      const success = await signIn(email, password);
      if (success) {
        router.replace('/(tabs)');
      }
    } else {
      if (!name) {
        setLocalError('Name is required.');
        return;
      }
      if (!password || password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      const success = await signUp(name, email, password);
      if (success) {
        router.replace('/(tabs)');
      }
    }
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email) {
      setLocalError('Email is required to reset password.');
      return;
    }

    const code = await requestResetCode(email);
    if (code) {
      setDevCode(code); // Store code so user can see it instantly
      setSuccessMessage(`Reset code generated! Please enter it below to reset password.`);
      setForgotMode(false);
      setResetMode(true);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    setLocalError(null);
    setSuccessMessage(null);

    if (!resetCode) {
      setLocalError('Verification code is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters.');
      return;
    }

    const success = await resetPassword(email, resetCode, newPassword);
    if (success) {
      setSuccessMessage('Password updated successfully. Please sign in.');
      setResetMode(false);
      setIsLogin(true);
      setPassword('');
      setNewPassword('');
      setResetCode('');
      setDevCode(null);
    }
  };

  const activeError = localError || authError;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
          
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>MOTUS</Text>
              <View style={styles.dot} />
            </View>
            <Text style={styles.subtitle}>
              {forgotMode && 'Recover your credentials.'}
              {resetMode && 'Create your new password.'}
              {!forgotMode && !resetMode && (isLogin ? 'Welcome back. Time to move.' : 'Join the elite. Start moving.')}
            </Text>
          </Animated.View>

          {/* Feedback messages */}
          {activeError && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorAlert}>
              <FontAwesome name="exclamation-circle" size={18} color="#FF3B30" style={{ marginRight: 8 }} />
              <Text style={styles.errorAlertText}>{activeError}</Text>
            </Animated.View>
          )}

          {successMessage && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.successAlert}>
              <FontAwesome name="check-circle" size={18} color="#39FF14" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successAlertText}>{successMessage}</Text>
                {devCode && (
                  <Text style={styles.devCodeText}>
                    Reset Code (Testing): <Text style={styles.devCodeHighlight}>{devCode}</Text>
                  </Text>
                )}
              </View>
            </Animated.View>
          )}

          <View style={styles.formContainer}>
            {/* SIGN UP NAME INPUT */}
            {!isLogin && !forgotMode && !resetMode && (
              <Animated.View key="signup-name-view" entering={FadeInDown.delay(200).springify()}>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'name' && styles.inputWrapperFocused
                ]}>
                  <FontAwesome name="user-o" size={20} color={focusedInput === 'name' ? '#39FF14' : '#666'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#666"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    selectionColor="#39FF14"
                  />
                </View>
              </Animated.View>
            )}

            {/* EMAIL INPUT (Login / Sign Up / Forgot Password) */}
            {!resetMode && (
              <Animated.View key="auth-email-view" entering={FadeInDown.delay(250).springify()}>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'email' && styles.inputWrapperFocused
                ]}>
                  <FontAwesome name="envelope-o" size={18} color={focusedInput === 'email' ? '#39FF14' : '#666'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor="#39FF14"
                  />
                </View>
              </Animated.View>
            )}

            {/* PASSWORD INPUT (Login / Sign Up) */}
            {!forgotMode && !resetMode && (
              <Animated.View key="auth-password-view" entering={FadeInDown.delay(300).springify()}>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'password' && styles.inputWrapperFocused
                ]}>
                  <FontAwesome name="lock" size={22} color={focusedInput === 'password' ? '#39FF14' : '#666'} style={[styles.inputIcon, { marginLeft: 2 }]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    secureTextEntry
                    selectionColor="#39FF14"
                  />
                </View>
              </Animated.View>
            )}

            {/* RESET PASSWORD CODE INPUT */}
            {resetMode && (
              <Animated.View key="reset-code-view" entering={FadeInDown.delay(200).springify()}>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'code' && styles.inputWrapperFocused
                ]}>
                  <FontAwesome name="key" size={20} color={focusedInput === 'code' ? '#39FF14' : '#666'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="6-Digit Reset Code"
                    placeholderTextColor="#666"
                    value={resetCode}
                    onChangeText={setResetCode}
                    onFocus={() => setFocusedInput('code')}
                    onBlur={() => setFocusedInput(null)}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectionColor="#39FF14"
                  />
                </View>
              </Animated.View>
            )}

            {/* NEW PASSWORD INPUT */}
            {resetMode && (
              <Animated.View key="reset-newpassword-view" entering={FadeInDown.delay(250).springify()}>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'newPassword' && styles.inputWrapperFocused
                ]}>
                  <FontAwesome name="lock" size={22} color={focusedInput === 'newPassword' ? '#39FF14' : '#666'} style={[styles.inputIcon, { marginLeft: 2 }]} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#666"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedInput('newPassword')}
                    onBlur={() => setFocusedInput(null)}
                    secureTextEntry
                    selectionColor="#39FF14"
                  />
                </View>
              </Animated.View>
            )}

            {/* FORGOT PASSWORD BUTTON */}
            {isLogin && !forgotMode && !resetMode && (
              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <TouchableOpacity 
                  style={styles.forgotPassword} 
                  onPress={() => setForgotMode(true)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* SUBMIT BUTTONS */}
            <Animated.View entering={FadeInUp.delay(400).springify()}>
              <TouchableOpacity 
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={
                  forgotMode ? handleForgotPassword :
                  resetMode ? handleResetPassword :
                  handleAuth
                }
                disabled={authLoading}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {forgotMode ? 'Send Reset Code' :
                     resetMode ? 'Update Password' :
                     (isLogin ? 'Sign In' : 'Create Account')}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* BACK TO LOGIN FOR FORGOT/RESET MODES */}
          {(forgotMode || resetMode) && (
            <Animated.View entering={FadeIn.delay(500).duration(800)} style={styles.backToLogin}>
              <TouchableOpacity onPress={() => {
                setForgotMode(false);
                setResetMode(false);
                setIsLogin(true);
              }}>
                <Text style={styles.footerAction}>Back to Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* TOGGLE LOGIN / SIGN UP */}
          {!forgotMode && !resetMode && (
            <Animated.View entering={FadeIn.delay(500).duration(800)} style={styles.footer}>
              <Text style={styles.footerText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={styles.footerAction}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 36,
    marginTop: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#39FF14',
    marginLeft: 6,
    marginBottom: 8,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  errorAlertText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  successAlertText: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: '600',
  },
  devCodeText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  devCodeHighlight: {
    color: '#39FF14',
    fontWeight: 'bold',
    fontSize: 15,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    height: 60,
    marginBottom: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  inputWrapperFocused: {
    borderColor: '#39FF14',
    backgroundColor: '#1C1C1E',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#39FF14',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  backToLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  footerAction: {
    color: '#39FF14',
    fontSize: 15,
    fontWeight: '700',
  },
});
