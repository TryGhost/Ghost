import { z } from 'zod';
import { createMutation } from '../utils/api/hooks';

export interface ImagesResponseType {
  images: {
    url: string;
    ref: string | null;
  }[];
}

export interface UploadImagePayload {
  file: File;
  /** False when the caller handles an expired session itself instead of leaving the page. */
  sessionExpiryRedirect?: boolean;
}

export const useUploadImage = createMutation<ImagesResponseType, UploadImagePayload>({
  method: 'POST',
  path: () => '/images/upload/',
  body: ({ file }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'image');
    return formData;
  },
  requestOptions: ({ sessionExpiryRedirect }) => ({ sessionExpiryRedirect }),
});

const UploadedImageResponseSchema = z.object({
  // Storage adapters may return relative paths as well as absolute URLs.
  images: z.array(z.object({ url: z.string().min(1) })).min(1),
});

export const getImageUrl = (response: unknown): string =>
  UploadedImageResponseSchema.parse(response).images[0].url;
