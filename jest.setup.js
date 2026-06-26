import { Alert } from 'react-native';

// Mock react-native-worklets to prevent native initialization error in Jest
jest.mock('react-native-worklets', () => {
  return {
    createSerializable: (val: any) => val,
    isWorkletFunction: () => false,
    RuntimeKind: { UI: 1, JS: 0 },
    scheduleOnUI: (fn: any) => fn,
    serializableMappingCache: new Map(),
    Worklets: {
      createRunOnJS: (fn: any) => fn,
      createRunOnContext: (fn: any) => fn,
    }
  };
}, { virtual: true });

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Stack: Object.assign(
      ({ children }: any) => React.createElement(React.Fragment, null, children),
      { Screen: ({ name }: any) => React.createElement(Text, null, name) }
    ),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name, style }: any) => React.createElement(Text, { style }, name),
  };
});

// Mock expo-symbols
jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SymbolView: ({ name }: any) => React.createElement(View, { testID: `symbol-${name}` }),
  };
});

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

// Mock react-native-reanimated with layouts
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  
  const makeAnimationMock = () => {
    const mock = {
      delay: () => mock,
      springify: () => mock,
      duration: () => mock,
      damping: () => mock,
      stiffness: () => mock,
      withDelay: () => mock,
    };
    return mock;
  };

  return {
    ...Reanimated,
    FadeInDown: makeAnimationMock(),
    FadeInUp: makeAnimationMock(),
    FadeIn: makeAnimationMock(),
    ZoomIn: makeAnimationMock(),
  };
});

// Mock Screen Time Native Module with standard ES module mock
const mockScreenTime = {
  getActiveLockCount: jest.fn(() => Promise.resolve(0)),
  blockApps: jest.fn(() => Promise.resolve()),
  unblockApps: jest.fn(() => Promise.resolve()),
  requestAuthorization: jest.fn(() => Promise.resolve()),
  showPicker: jest.fn(() => Promise.resolve(true)),
};

jest.mock('../../modules/motus-screen-time/src/MotusScreenTimeModule', () => ({
  __esModule: true,
  default: mockScreenTime
}), { virtual: true });

jest.mock('./modules/motus-screen-time/src/MotusScreenTimeModule', () => ({
  __esModule: true,
  default: mockScreenTime
}), { virtual: true });

// Spy on Alert
jest.spyOn(Alert, 'alert');
