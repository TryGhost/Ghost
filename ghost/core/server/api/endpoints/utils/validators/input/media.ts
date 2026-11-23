import type { Frame } from '@tryghost/api-framework';
import limits from '../../../../../../../shared/limits';

type UploadFrame = Frame & { file: { size: number } };

module.exports = {
  async upload(apiConfig: unknown, frame: UploadFrame) {
    await limits.service.errorIfIsOverLimit('uploads', { currentCount: frame.file.size });
  },

  async uploadThumbnail(apiConfig: unknown, frame: UploadFrame) {
    await limits.service.errorIfIsOverLimit('uploads', { currentCount: frame.file.size });
  },
};
