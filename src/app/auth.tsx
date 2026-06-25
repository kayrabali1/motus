import React, { useState } from 'react';
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
  TouchableWithoutFeedback
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleAuth = () => {
    router.replace('/(tabs)');
  };

  const handleSocialAuth = (provider: string) => {
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          
          <Animated.View 
            entering={FadeInDown.delay(200).springify()}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>MOTUS</Text>
              <View style={styles.dot} />
            </View>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome back. Time to move.' : 'Join the elite. Start moving.'}
            </Text>
          </Animated.View>

          <View style={styles.formContainer}>
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <View style={[
                styles.inputWrapper, 
                focusedInput === 'email' && styles.inputWrapperFocused
              ]}>
                <FontAwesome name="envelope-o" size={20} color={focusedInput === 'email' ? '#39FF14' : '#666'} style={styles.inputIcon} />
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

            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <View style={[
                styles.inputWrapper, 
                focusedInput === 'password' && styles.inputWrapperFocused
              ]}>
                <FontAwesome name="lock" size={24} color={focusedInput === 'password' ? '#39FF14' : '#666'} style={[styles.inputIcon, { marginLeft: 2 }]} />
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

            {isLogin && (
              <Animated.View entering={FadeInDown.delay(450).springify()}>
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(500).springify()}>
              <TouchableOpacity 
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleAuth}
              >
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Animated.View entering={FadeIn.delay(600).duration(800)} style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </Animated.View>

          <View style={styles.socialContainer}>
            <Animated.View entering={FadeInUp.delay(700).springify()} style={{ flex: 0.47 }}>
              <TouchableOpacity 
                style={styles.socialButton}
                activeOpacity={0.8}
                onPress={() => handleSocialAuth('apple')}
              >
                <FontAwesome name="apple" size={24} color="#FFF" style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(800).springify()} style={{ flex: 0.47 }}>
              <TouchableOpacity 
                style={styles.socialButton}
                activeOpacity={0.8}
                onPress={() => handleSocialAuth('google')}
              >
                <FontAwesome name="google" size={24} color="#FFF" style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Animated.View entering={FadeIn.delay(900).duration(800)} style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.footerAction}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    marginTop: 60,
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
  formContainer: {
    marginBottom: 32,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
