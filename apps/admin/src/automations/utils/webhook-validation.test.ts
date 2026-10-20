import { describe, expect, it } from 'vitest';
import { getWebhookError } from './webhook-validation';

const valid = {
  url: 'https://example.com/hook',
  method: 'POST' as const,
  body: '{"id": "{{member.id}}", "email": "{{ member.email }}"}',
};

describe('getWebhookError', () => {
  it('accepts an HTTPS URL with a JSON body using supported tags', () => {
    expect(getWebhookError(valid)).toBeUndefined();
  });

  it.each(['', 'example.com', 'http://example.com', 'ftp://example.com', 'https://'])(
    'rejects the URL %j',
    (url) => {
      expect(getWebhookError({ ...valid, url })).toBe('Enter an HTTPS URL.');
    },
  );

  it.each(['', '{', '{"id": {{member.id}}}', "{'single': 'quotes'}"])(
    'rejects the body %j',
    (body) => {
      expect(getWebhookError({ ...valid, body })).toBe('Enter a valid JSON body.');
    },
  );

  it('rejects unsupported tags', () => {
    expect(getWebhookError({ ...valid, body: '{"name": "{{member.name}}"}' })).toBe(
      '{{member.name}} isn’t supported. Use {{member.id}} or {{member.email}}.',
    );
  });
});
