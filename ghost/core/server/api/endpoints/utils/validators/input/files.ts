import type { Frame } from '@tryghost/api-framework';
import { limitService } from '../../../../../services/limits';

type UploadFrame = Frame & { file: { size: number } };

module.exports = {
  async upload(apiConfig: unknown, frame: UploadFrame) {
    await limitService.errorIfIsOverLimit('uploads', { currentCount: frame.file.size });
  },
};
