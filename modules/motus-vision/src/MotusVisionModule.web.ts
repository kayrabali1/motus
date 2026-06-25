import { registerWebModule, NativeModule } from 'expo';

class MotusVisionModule extends NativeModule<{}> {}

export default registerWebModule(MotusVisionModule, 'MotusVisionModule');
