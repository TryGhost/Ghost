import errors from '@tryghost/errors';

export const MAX_CSV_UPLOAD_BYTES = 1024 ** 3; // 1 GiB (1,024 MiB; approximately 1,074 MB).
export const MAX_CSV_ZIP_ENTRIES = 50_000;

export function assertCSVUploadSize(bytes: number): void {
  if (bytes > MAX_CSV_UPLOAD_BYTES) {
    throw new errors.UnsupportedMediaTypeError({
      message: 'CSV and ZIP uploads cannot exceed 1 GiB.',
      code: 'CSV_UPLOAD_TOO_LARGE',
    });
  }
}
