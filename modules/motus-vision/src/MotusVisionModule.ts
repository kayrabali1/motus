import { NativeModule, requireNativeModule } from 'expo';

declare class MotusVisionModule extends NativeModule<{}> {}

export default requireNativeModule<MotusVisionModule>('MotusVision');
