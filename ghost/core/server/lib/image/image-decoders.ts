import { setAllowedDecoders } from '@tryghost/image-transform';
import { getImageLoader } from './image-formats';

// sharp picks its decoder from a file's contents, not its name, so limit the
// libvips loaders it can use to the image formats Ghost is configured to
// accept.

// Gift link previews are rendered from an internal PNG and SVG, whatever the
// upload config says
const ALWAYS_ALLOWED_LOADERS = ['VipsForeignLoadPng', 'VipsForeignLoadSvg'];

export function getAllowedImageLoaders(extensions: readonly string[]): string[] {
  const loaders = new Set(ALWAYS_ALLOWED_LOADERS);

  for (const ext of extensions) {
    const loader = getImageLoader(ext);
    if (loader) {
      loaders.add(loader);
    }
  }

  return [...loaders].sort();
}

/**
 * Blocks every libvips loader except the ones needed for the given extensions.
 * Doesn't load sharp: @tryghost/image-transform applies the block when sharp is
 * first needed, so get sharp from there rather than requiring it directly. The
 * block is process-wide, but lives in libvips, so it only covers copies of
 * sharp that share Ghost's libvips.
 *
 * @returns the allowed loaders
 */
export function restrictImageDecoders(extensions: readonly string[]): string[] {
  const loaders = getAllowedImageLoaders(extensions);
  setAllowedDecoders(loaders);
  return loaders;
}
