import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput, TouchableOpacity, Text, ActivityIndicator, Platform, ScrollView } from 'react-native';
import AuthScreen, { AuthInput } from '../auth';
import { useMotusStore } from '../../store/useStore';

// Mock the store
jest.mock('../../store/useStore', () => ({
  useMotusStore: jest.fn(),
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();

// Mock useRouter
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

describe('AuthScreen Unit & Integration Tests (TestRenderer)', () => {
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {
      signUp: jest.fn(),
      signIn: jest.fn(),
      requestResetCode: jest.fn(),
      resetPassword: jest.fn(),
      authLoading: false,
      authError: null,
      clearAuthError: jest.fn(),
      token: null,
    };
    (useMotusStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  const renderComponent = () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<AuthScreen />);
    });
    return renderer;
  };

  const findButtonWithText = (root: any, textContent: string) => {
    return root.findAllByType(TouchableOpacity).find((t: any) => {
      const texts = t.findAllByType(Text);
      return texts.some((text: any) => text.props.children === textContent);
    });
  };

  const findTextWithContent = (root: any, content: string) => {
    return root.findAllByType(Text).find((t: any) => {
      if (Array.isArray(t.props.children)) {
        return t.props.children.join('').includes(content);
      }
      return t.props.children === content;
    });
  };

  const getPrimaryButton = (root: any) => {
    return root.findAllByType(TouchableOpacity).find((t: any) => {
      // Primary button style shadowColor is '#39FF14'
      const style = t.props.style;
      const flattened = Array.isArray(style) ? Object.assign({}, ...style) : style;
      return flattened && flattened.shadowColor === '#39FF14';
    });
  };

  // Redirect on token
  it('should redirect immediately to tabs if token is present', () => {
    mockStore.token = 'existing-token';
    renderComponent();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  // Sign In Flow
  it('should render Sign In screen by default', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    
    expect(root.findByProps({ placeholder: 'Email' })).toBeTruthy();
    expect(root.findByProps({ placeholder: 'Password' })).toBeTruthy();
    expect(findButtonWithText(root, 'Sign In')).toBeTruthy();
  });

  it('should validate empty email on signin', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    const signInButton = getPrimaryButton(root);
    
    act(() => {
      signInButton.props.onPress();
    });
    
    expect(findTextWithContent(root, 'Email is required.')).toBeTruthy();
    expect(mockStore.signIn).not.toHaveBeenCalled();
  });

  it('should validate empty password on signin', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    
    const emailInput = root.findByProps({ placeholder: 'Email' });
    act(() => {
      emailInput.props.onChangeText('test@fit.com');
    });

    const signInButton = getPrimaryButton(root);
    act(() => {
      signInButton.props.onPress();
    });
    
    expect(findTextWithContent(root, 'Password is required.')).toBeTruthy();
    expect(mockStore.signIn).not.toHaveBeenCalled();
  });

  it('should call signIn action and redirect on success', async () => {
    mockStore.signIn.mockResolvedValue(true);
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('test@fit.com');
      root.findByProps({ placeholder: 'Password' }).props.onChangeText('pass123');
    });

    const signInButton = getPrimaryButton(root);
    await act(async () => {
      await signInButton.props.onPress();
    });

    expect(mockStore.signIn).toHaveBeenCalledWith('test@fit.com', 'pass123');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('should display auth error from store on signin failure', async () => {
    mockStore.signIn.mockResolvedValue(false);
    mockStore.authError = 'Invalid email or password.';
    
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('test@fit.com');
      root.findByProps({ placeholder: 'Password' }).props.onChangeText('wrongpass');
    });

    const signInButton = getPrimaryButton(root);
    await act(async () => {
      await signInButton.props.onPress();
    });

    expect(findTextWithContent(root, 'Invalid email or password.')).toBeTruthy();
  });

  // Sign Up Flow
  it('should toggle to Sign Up mode and validate name', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    
    // Toggle to Sign Up
    const signUpLink = findButtonWithText(root, 'Sign Up');
    act(() => {
      signUpLink.props.onPress();
    });
    
    expect(root.findByProps({ placeholder: 'Full Name' })).toBeTruthy();
    expect(root.findByProps({ placeholder: 'Email' })).toBeTruthy();
    expect(root.findByProps({ placeholder: 'Password' })).toBeTruthy();

    // Set email first to bypass the email requirement check
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
    });

    const createBtn = getPrimaryButton(root);
    act(() => {
      createBtn.props.onPress();
    });

    expect(findTextWithContent(root, 'Name is required.')).toBeTruthy();
  });

  it('should validate password length on signup', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      findButtonWithText(root, 'Sign Up').props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: 'Full Name' }).props.onChangeText('Kayra Bali');
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
      root.findByProps({ placeholder: 'Password' }).props.onChangeText('123'); // short
    });

    act(() => {
      getPrimaryButton(root).props.onPress();
    });

    expect(findTextWithContent(root, 'Password must be at least 6 characters.')).toBeTruthy();
    expect(mockStore.signUp).not.toHaveBeenCalled();
  });

  it('should sign up successfully and redirect', async () => {
    mockStore.signUp.mockResolvedValue(true);
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      findButtonWithText(root, 'Sign Up').props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: 'Full Name' }).props.onChangeText('Kayra Bali');
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
      root.findByProps({ placeholder: 'Password' }).props.onChangeText('secret123');
    });

    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    expect(mockStore.signUp).toHaveBeenCalledWith('Kayra Bali', 'kayra@fit.com', 'secret123');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  // Forgot Password Flow
  it('should toggle to Forgot Password mode and validate input', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    
    expect(root.findByProps({ placeholder: 'Email' })).toBeTruthy();
    expect(root.findAllByProps({ placeholder: 'Password' }).length).toBe(0);

    // Submit with empty email
    act(() => {
      getPrimaryButton(root).props.onPress();
    });
    
    expect(findTextWithContent(root, 'Email is required to reset password.')).toBeTruthy();
  });

  it('should request reset code successfully and transition to Reset mode', async () => {
    mockStore.requestResetCode.mockResolvedValue('555444');
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
    });

    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    expect(mockStore.requestResetCode).toHaveBeenCalledWith('kayra@fit.com');
    
    // Check reset mode inputs are loaded
    expect(root.findByProps({ placeholder: '6-Digit Reset Code' })).toBeTruthy();
    expect(root.findByProps({ placeholder: 'New Password' })).toBeTruthy();
  });

  // Reset Password Flow
  it('should validate reset inputs', async () => {
    mockStore.requestResetCode.mockResolvedValue('555444');
    const renderer = renderComponent();
    const root = renderer.root;
    
    // Transition to Reset mode
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
    });
    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });
    
    // Submit with empty code
    act(() => {
      getPrimaryButton(root).props.onPress();
    });

    expect(findTextWithContent(root, 'Verification code is required.')).toBeTruthy();

    // Enter code but short password
    act(() => {
      root.findByProps({ placeholder: '6-Digit Reset Code' }).props.onChangeText('555444');
      root.findByProps({ placeholder: 'New Password' }).props.onChangeText('12');
    });
    act(() => {
      getPrimaryButton(root).props.onPress();
    });

    expect(findTextWithContent(root, 'New password must be at least 6 characters.')).toBeTruthy();
    expect(mockStore.resetPassword).not.toHaveBeenCalled();
  });

  it('should reset password successfully and return to login screen', async () => {
    mockStore.requestResetCode.mockResolvedValue('555444');
    mockStore.resetPassword.mockResolvedValue(true);
    const renderer = renderComponent();
    const root = renderer.root;
    
    // Transition to Reset
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
    });
    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: '6-Digit Reset Code' }).props.onChangeText('555444');
      root.findByProps({ placeholder: 'New Password' }).props.onChangeText('newpassword123');
    });

    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    expect(mockStore.resetPassword).toHaveBeenCalledWith('kayra@fit.com', '555444', 'newpassword123');
    
    // Verifies we are back in Sign In mode
    expect(findButtonWithText(root, 'Sign In')).toBeTruthy();
    expect(root.findByProps({ placeholder: 'Password' })).toBeTruthy();
  });

  // Navigation Links / Back Buttons
  it('should navigate back to Sign In from Forgot Password mode', () => {
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    expect(root.findAllByProps({ placeholder: 'Password' }).length).toBe(0);

    act(() => {
      findButtonWithText(root, 'Back to Sign In').props.onPress();
    });
    expect(root.findByProps({ placeholder: 'Password' })).toBeTruthy();
  });

  // Input Focus/Blur styling updates coverage
  it('should handle input focus and blur styling correctly for all inputs', async () => {
    const renderer = renderComponent();
    const root = renderer.root;

    // Helper to find TextInput by placeholder
    const findTextInput = (placeholder: string) => 
      root.findAllByType(TextInput).find((i: any) => i.props.placeholder === placeholder);

    // 1. Email (Sign In)
    const emailInput = findTextInput('Email');
    expect(emailInput).toBeTruthy();
    act(() => { emailInput.props.onFocus(); });
    act(() => { emailInput.props.onBlur(); });

    // 2. Password (Sign In)
    const passwordInput = findTextInput('Password');
    expect(passwordInput).toBeTruthy();
    act(() => { passwordInput.props.onFocus(); });
    act(() => { passwordInput.props.onBlur(); });

    // Switch to Sign Up
    act(() => {
      findButtonWithText(root, 'Sign Up').props.onPress();
    });

    // 3. Full Name (Sign Up)
    const nameInput = findTextInput('Full Name');
    expect(nameInput).toBeTruthy();
    act(() => { nameInput.props.onFocus(); });
    act(() => { nameInput.props.onBlur(); });

    // Transition to Reset Mode
    mockStore.requestResetCode.mockResolvedValue('555444');
    act(() => {
      findButtonWithText(root, 'Sign In').props.onPress();
    });
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    act(() => {
      const emailInputReset = findTextInput('Email');
      expect(emailInputReset).toBeTruthy();
      emailInputReset.props.onChangeText('kayra@fit.com');
    });
    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    // 4. Code (Reset Mode)
    const codeInput = findTextInput('6-Digit Reset Code');
    expect(codeInput).toBeTruthy();
    act(() => { codeInput.props.onFocus(); });
    act(() => { codeInput.props.onBlur(); });

    // 5. New Password (Reset Mode)
    const newPasswordInput = findTextInput('New Password');
    expect(newPasswordInput).toBeTruthy();
    act(() => { newPasswordInput.props.onFocus(); });
    act(() => { newPasswordInput.props.onBlur(); });
  });

  // Additional flow failure coverage
  it('should display auth error on signup failure', async () => {
    mockStore.signUp.mockResolvedValue(false);
    mockStore.authError = 'Email already in use.';
    const renderer = renderComponent();
    const root = renderer.root;

    act(() => {
      findButtonWithText(root, 'Sign Up').props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: 'Full Name' }).props.onChangeText('Kayra');
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
      root.findByProps({ placeholder: 'Password' }).props.onChangeText('secret123');
    });

    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    expect(mockStore.signUp).toHaveBeenCalledWith('Kayra', 'kayra@fit.com', 'secret123');
    expect(findTextWithContent(root, 'Email already in use.')).toBeTruthy();
  });

  it('should display auth error on forgot password failure', async () => {
    mockStore.requestResetCode.mockResolvedValue(null);
    mockStore.authError = 'User not found.';
    const renderer = renderComponent();
    const root = renderer.root;
    
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('unknown@fit.com');
    });

    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    expect(mockStore.requestResetCode).toHaveBeenCalledWith('unknown@fit.com');
    expect(findTextWithContent(root, 'User not found.')).toBeTruthy();
  });

  it('should display auth error on reset password failure', async () => {
    mockStore.requestResetCode.mockResolvedValue('555444');
    mockStore.resetPassword.mockResolvedValue(false);
    mockStore.authError = 'Invalid code.';
    const renderer = renderComponent();
    const root = renderer.root;

    // Transition to Reset
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
    });
    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: '6-Digit Reset Code' }).props.onChangeText('555444');
      root.findByProps({ placeholder: 'New Password' }).props.onChangeText('newpassword123');
    });

    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    expect(mockStore.resetPassword).toHaveBeenCalledWith('kayra@fit.com', '555444', 'newpassword123');
    expect(findTextWithContent(root, 'Invalid code.')).toBeTruthy();
  });

  it('should validate empty new password on reset', async () => {
    mockStore.requestResetCode.mockResolvedValue('555444');
    const renderer = renderComponent();
    const root = renderer.root;

    // Transition to Reset
    act(() => {
      findButtonWithText(root, 'Forgot password?').props.onPress();
    });
    act(() => {
      root.findByProps({ placeholder: 'Email' }).props.onChangeText('kayra@fit.com');
    });
    await act(async () => {
      await getPrimaryButton(root).props.onPress();
    });

    act(() => {
      root.findByProps({ placeholder: '6-Digit Reset Code' }).props.onChangeText('555444');
      root.findByProps({ placeholder: 'New Password' }).props.onChangeText('');
    });

    act(() => {
      getPrimaryButton(root).props.onPress();
    });

    expect(findTextWithContent(root, 'New password must be at least 6 characters.')).toBeTruthy();
    expect(mockStore.resetPassword).not.toHaveBeenCalled();
  });

  // Activity Indicator / Loader check
  it('should render ActivityIndicator when authLoading is true', () => {
    mockStore.authLoading = true;
    const renderer = renderComponent();
    const root = renderer.root;
    expect(root.findByType(ActivityIndicator)).toBeTruthy();
  });

  it('should render ScrollView with automaticallyAdjustKeyboardInsets', () => {
    const renderer = renderComponent();
    const scroll = renderer.root.findByType(ScrollView);
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });

  describe('AuthInput component unit tests', () => {
    it('should invoke onFocus and onBlur callbacks if provided', () => {
      const mockFocus = jest.fn();
      const mockBlur = jest.fn();
      let testRenderer: any;
      act(() => {
        testRenderer = TestRenderer.create(
          <AuthInput
            icon="lock"
            placeholder="Password"
            value=""
            onChangeText={() => {}}
            onFocus={mockFocus}
            onBlur={mockBlur}
          />
        );
      });
      const textInput = testRenderer.root.findByType(TextInput);
      
      act(() => {
        textInput.props.onFocus();
      });
      expect(mockFocus).toHaveBeenCalled();

      act(() => {
        textInput.props.onBlur();
      });
      expect(mockBlur).toHaveBeenCalled();
    });
  });
});
