import { NativeModule, requireNativeModule } from 'expo';

declare class MotusScreenTimeModule extends NativeModule<{}> {
  requestAuthorization(): Promise<boolean>;
  showPicker(): Promise<boolean>;
  blockApps(): void;
  unblockApps(): void;
  getActiveLockCount(): Promise<number>;
  showLockedApps(): Promise<void>;
  getPendingUnlockAppName(): Promise<string | null>;
}

export default requireNativeModule<MotusScreenTimeModule>('MotusScreenTime');
