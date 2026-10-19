import { Color } from '@tryghost/color-utils';

// eslint-disable-next-line camelcase
export function color_to_rgba(color: unknown, alpha: unknown): string {
  const backgroundColor = typeof color === 'string' && color.trim() ? color.trim() : '#15171A';
  const opacity =
    typeof alpha === 'number' && Number.isFinite(alpha) ? alpha : Number.parseFloat(String(alpha));
  const normalizedOpacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0.25;

  try {
    return new Color(backgroundColor).alpha(normalizedOpacity).rgb().string();
  } catch {
    return 'rgba(21, 23, 26, 0.25)';
  }
}
