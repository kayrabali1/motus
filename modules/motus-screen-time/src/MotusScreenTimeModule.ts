import { NativeModule, requireNativeModule } from 'expo';

declare class MotusScreenTimeModule extends NativeModule<{}> {
  requestAuthorization(): Promise<boolean>;
  showPicker(): Promise<boolean>;
  blockApps(): void;
  unblockApps(): void;
}

export default requireNativeModule<MotusScreenTimeModule>('MotusScreenTime');
