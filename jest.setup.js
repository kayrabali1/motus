import { Alert } from 'react-native';

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

jest.spyOn(Alert, 'alert');
