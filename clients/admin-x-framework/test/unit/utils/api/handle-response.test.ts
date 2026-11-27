import handleResponse from '../../../../src/utils/api/handle-response';
import {
  JSONError,
  ThemeValidationError,
  UnsupportedMediaTypeError,
} from '../../../../src/utils/errors';

const response = (body: BodyInit | null, contentType: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': contentType } });

describe('handleResponse', () => {
  it('parses JSON responses', async () => {
    await expect(handleResponse(response('{"themes": []}', 'application/json'))).resolves.toEqual({
      themes: [],
    });
  });

  it('returns undefined for 204 responses', async () => {
    await expect(handleResponse(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it('returns text for text/csv responses', async () => {
    await expect(handleResponse(response('id,email\n', 'text/csv'))).resolves.toBe('id,email\n');
  });

  it('returns text for other text/* responses', async () => {
    await expect(handleResponse(response('routes:\n', 'text/yaml; charset=utf-8'))).resolves.toBe(
      'routes:\n',
    );
  });

  it('returns text for application/yaml responses', async () => {
    await expect(handleResponse(response('routes:\n', 'application/yaml'))).resolves.toBe(
      'routes:\n',
    );
  });

  it('returns a Blob when responseType is blob', async () => {
    const result = (await handleResponse(response('binary', 'application/zip'), {
      responseType: 'blob',
    })) as Blob;

    // instanceof fails across realms (undici Blob vs jsdom Blob), so assert shape
    expect(result.constructor.name).toBe('Blob');
    expect(result.type).toBe('application/zip');
    await expect(result.text()).resolves.toBe('binary');
  });

  it('returns an ArrayBuffer when responseType is arraybuffer', async () => {
    const result = await handleResponse(response('binary', 'application/zip'), {
      responseType: 'arraybuffer',
    });

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(result as ArrayBuffer)).toBe('binary');
  });

  it('returns undefined for 204 responses when responseType is set', async () => {
    await expect(
      handleResponse(new Response(null, { status: 204 }), { responseType: 'blob' }),
    ).resolves.toBeUndefined();
  });

  it('throws API errors even when responseType is set', async () => {
    const body = JSON.stringify({
      errors: [{ type: 'ThemeValidationError', message: 'Invalid theme' }],
    });

    const promise = handleResponse(response(body, 'application/json', 422), {
      responseType: 'arraybuffer',
    });

    await expect(promise).rejects.toBeInstanceOf(ThemeValidationError);
  });

  it('throws JSONError with the parsed body for untyped JSON errors', async () => {
    const body = JSON.stringify({ errors: [{ message: 'Nope' }] });

    const promise = handleResponse(response(body, 'application/json', 422));

    await expect(promise).rejects.toBeInstanceOf(JSONError);
    await expect(promise).rejects.toMatchObject({ data: { errors: [{ message: 'Nope' }] } });
  });

  it('throws UnsupportedMediaTypeError with the raw text for 415 responses', async () => {
    const body = JSON.stringify({ errors: [{ code: 'ENTRY_TOO_LARGE' }] });

    const promise = handleResponse(response(body, 'application/json', 415));

    await expect(promise).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
    await expect(promise).rejects.toMatchObject({ data: body });
  });
});
