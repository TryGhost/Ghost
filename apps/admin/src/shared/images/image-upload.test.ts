import { describe, expect, it } from 'vitest';
import {
  JSONError,
  RequestEntityTooLargeError,
  UnsupportedMediaTypeError,
  type ErrorResponse,
} from '@tryghost/admin-x-framework/errors';
import { UNSUPPORTED_IMAGE_MESSAGE, uploadErrorMessage } from './image-upload';

function apiErrors(message: string): ErrorResponse {
  return { errors: [{ message }] } as ErrorResponse;
}

describe('uploadErrorMessage', () => {
  it('names the file types the endpoint accepts', () => {
    const error = new UnsupportedMediaTypeError(new Response(), null);
    expect(uploadErrorMessage(error, 'feature image')).toBe(UNSUPPORTED_IMAGE_MESSAGE);
  });

  it('reports a file the server was too small to take', () => {
    const error = new RequestEntityTooLargeError(new Response(), null);
    expect(uploadErrorMessage(error, 'feature image')).toBe(
      'The image you uploaded was larger than the maximum file size your server allows.',
    );
  });

  it('prefers the reason the server gave', () => {
    const error = new JSONError(new Response(), apiErrors('The image is corrupt.'));
    expect(uploadErrorMessage(error, 'X image')).toBe('The image is corrupt.');
  });

  it('falls back to naming the image the field was uploading', () => {
    expect(uploadErrorMessage(new Error('offline'), 'X image')).toBe(
      'Couldn’t upload the X image.',
    );
    expect(uploadErrorMessage(new Error('offline'), 'Facebook image')).toBe(
      'Couldn’t upload the Facebook image.',
    );
    expect(uploadErrorMessage(new Error('offline'), 'image')).toBe('Couldn’t upload the image.');
  });
});
