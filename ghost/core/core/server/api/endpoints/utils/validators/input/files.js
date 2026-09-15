const limitService = require('../../../../../services/limits').default;

module.exports = {
  async upload(apiConfig, frame) {
    await limitService.errorIfIsOverLimit('uploads', { currentCount: frame.file.size });
  },
};
