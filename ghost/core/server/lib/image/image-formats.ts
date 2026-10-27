// Image formats keyed by name, with every extension that can refer to them
// and the libvips loader that decodes them. Configured extensions and the
// extensions `file-type` reports (e.g. `.tif`, `.jpg`, `.apng`, `.heic`) often
// differ, so both are compared by format rather than by spelling.
interface ImageFormat {
  extensions: readonly string[];
  // Blocking a loader also blocks its file/buffer/source subclasses
  loader?: string;
}

const IMAGE_FORMATS: Record<string, ImageFormat> = {
  jpeg: { extensions: ['.jpg', '.jpeg', '.jpe', '.jfif'], loader: 'VipsForeignLoadJpeg' },
  // file-type reports animated PNGs as .apng; they decode as PNG
  png: { extensions: ['.png', '.apng'], loader: 'VipsForeignLoadPng' },
  gif: { extensions: ['.gif'], loader: 'VipsForeignLoadNsgif' },
  webp: { extensions: ['.webp'], loader: 'VipsForeignLoadWebp' },
  svg: { extensions: ['.svg', '.svgz'], loader: 'VipsForeignLoadSvg' },
  avif: { extensions: ['.avif'], loader: 'VipsForeignLoadHeif' },
  // file-type reports both .heic and .heif files as .heic
  heic: { extensions: ['.heic', '.heif'], loader: 'VipsForeignLoadHeif' },
  tiff: { extensions: ['.tif', '.tiff'], loader: 'VipsForeignLoadTiff' },
  // No libvips loader, so .ico files can be stored but never processed
  ico: { extensions: ['.ico'] },
};

const FORMAT_BY_EXTENSION = new Map(
  Object.entries(IMAGE_FORMATS).flatMap(([name, format]) =>
    format.extensions.map((ext) => [ext, name] as const),
  ),
);

/**
 * @returns the format name for an extension (including the leading dot), or
 * undefined when it isn't a known image format
 */
export function getImageFormat(ext: string): string | undefined {
  return FORMAT_BY_EXTENSION.get(ext.toLowerCase());
}

/**
 * @returns the libvips loader for an extension, or undefined when there is none
 */
export function getImageLoader(ext: string): string | undefined {
  const format = getImageFormat(ext);
  return format ? IMAGE_FORMATS[format].loader : undefined;
}
