import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { ViewProps } from 'react-native';

export type OnRepDetectedEvent = {
  count: number;
  isSuccess: boolean;
};

export type MotusVisionViewProps = {
  exerciseType: string;
  playSound?: boolean;
  targetReps?: number;
  strictMode?: boolean;
  onRepDetected?: (event: { nativeEvent: OnRepDetectedEvent }) => void;
} & ViewProps;

const NativeView: React.ComponentType<MotusVisionViewProps> = requireNativeViewManager('MotusVision');

export default function MotusVisionView(props: MotusVisionViewProps) {
  return <NativeView {...props} />;
}
