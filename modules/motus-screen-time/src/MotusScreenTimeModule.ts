import { NativeModule, requireNativeModule } from 'expo';

declare class MotusScreenTimeModule extends NativeModule<{}> {
  requestAuthorization(): Promise<boolean>;
  showPicker(isPro: boolean): Promise<boolean>;
  blockApps(): void;
  unblockApps(): void;
  getActiveLockCount(): Promise<number>;
  showLockedApps(): Promise<void>;
  getPendingUnlockAppName(): Promise<string | null>;
  hasPendingUnlock(): Promise<boolean>;
  setProMemberStatus(isPro: boolean): void;
}

export default requireNativeModule<MotusScreenTimeModule>('MotusScreenTime');
