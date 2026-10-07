const { Color } = require('@tryghost/color-utils');

// eslint-disable-next-line camelcase
module.exports = function color_to_rgba(color, alpha) {
  const backgroundColor = typeof color === 'string' && color.trim() ? color.trim() : '#15171A';
  const opacity = Number.isFinite(alpha) ? alpha : Number.parseFloat(alpha);
  const normalizedOpacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0.25;

  try {
    return new Color(backgroundColor).alpha(normalizedOpacity).rgb().string();
  } catch (err) {
    return 'rgba(21, 23, 26, 0.25)';
  }
};
