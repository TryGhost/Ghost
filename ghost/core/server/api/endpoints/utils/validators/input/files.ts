import { limitService } from '../../../../../services/limits';

module.exports = {
  async upload(apiConfig: unknown, frame: { file: { size: number } }) {
    await limitService.errorIfIsOverLimit('uploads', { currentCount: frame.file.size });
  },
};
