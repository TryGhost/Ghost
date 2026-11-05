import { describe, expect, it } from 'vitest';

import {
  ANSWER_TOO_LARGE,
  APP_LOAD_MESSAGES,
  MANIFEST_MAX_BYTES,
  SIGNED_MANIFEST_MAX_BYTES,
  dropCredentials,
  isRedirect,
  isSuccess,
  parseJsonText,
  readLocation,
  staysOnHost,
} from '../../src/identity/index.ts';
import { formatManifestErrors } from '../../src/manifest/index.ts';

describe('the limits Ghost reads an app with', () => {
  it('reads a signed manifest that holds a manifest of the largest size Ghost stores', () => {
    const payload = Math.ceil((MANIFEST_MAX_BYTES * 4) / 3);
    expect(SIGNED_MANIFEST_MAX_BYTES - payload).toBe(1024);
  });

  it('says the limits in its messages', () => {
    expect(APP_LOAD_MESSAGES.APP_MANIFEST_TOO_LARGE).toBe(
      'The app’s manifest is larger than 64 KB.',
    );
    expect(ANSWER_TOO_LARGE).toBe('The answer is larger than 4 KB');
  });
});

describe('statuses', () => {
  it.each([
    [199, false, false],
    [200, true, false],
    [299, true, false],
    [300, false, true],
    [399, false, true],
    [400, false, false],
  ])('reads %i as a success (%s) or a redirect (%s)', (status, success, redirect) => {
    expect(isSuccess(status)).toBe(success);
    expect(isRedirect(status)).toBe(redirect);
  });
});

describe('staysOnHost', () => {
  const from = (url: string) => (to: string) => staysOnHost(new URL(url), new URL(to));

  it('follows a redirect on the same origin', () => {
    expect(from('https://app.example.com/a')('https://app.example.com/b')).toBe(true);
  });

  it('follows an upgrade from HTTP to HTTPS on the same host, on the default ports', () => {
    expect(from('http://app.example.com/a')('https://app.example.com/a')).toBe(true);
    expect(from('http://app.example.com:8080/')('https://app.example.com/')).toBe(false);
    expect(from('http://app.example.com/')('https://app.example.com:8443/')).toBe(false);
  });

  it('refuses another host, a downgrade, or another port', () => {
    expect(from('https://app.example.com/')('https://other.example.com/')).toBe(false);
    expect(from('https://app.example.com/')('http://app.example.com/')).toBe(false);
    expect(from('https://app.example.com/')('https://app.example.com:8443/')).toBe(false);
  });
});

describe('readLocation', () => {
  it('resolves a Location against the URL it answered', () => {
    expect(readLocation('/b?c', 'https://app.example.com/a')?.href).toBe(
      'https://app.example.com/b?c',
    );
  });

  it('is null for a Location that is not a URL', () => {
    expect(readLocation('https://[', 'https://app.example.com/')).toBeNull();
  });

  it('reads the latin1 a header arrives as as UTF-8, as Buffer does', () => {
    const latin1 = (text: string) => Buffer.from(text, 'utf8').toString('binary');
    expect(readLocation(latin1('/ä'), 'https://app.example.com/')?.pathname).toBe('/%C3%A4');
    // Every byte, alone and in pairs, decodes as Buffer decodes it, invalid sequences included.
    for (let first = 0; first < 256; first++) {
      for (const second of [undefined, 0x80, 0xbf, 0xc3, 0xff]) {
        const raw = String.fromCharCode(first, ...(second === undefined ? [] : [second]));
        const expected = URL.parse(
          Buffer.from(raw, 'binary').toString('utf8'),
          'https://app.example.com/',
        );
        expect(readLocation(raw, 'https://app.example.com/')?.href).toBe(expected?.href);
      }
    }
  });
});

describe('dropCredentials', () => {
  it('drops the username and password from the URL it is given', () => {
    const url = new URL('https://app.example.com/a');
    url.username = 'user';
    url.password = 'pass';
    expect(dropCredentials(url)).toBe(url);
    expect(url.href).toBe('https://app.example.com/a');
  });
});

describe('parseJsonText', () => {
  it('reads JSON, with or without a byte order mark', () => {
    expect(parseJsonText('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonText('﻿{"a":1}')).toEqual({ a: 1 });
  });

  it('refuses anything else, a second byte order mark included', () => {
    expect(() => parseJsonText('﻿﻿{}')).toThrow(SyntaxError);
    expect(() => parseJsonText('nope')).toThrow(SyntaxError);
  });
});

describe('formatManifestErrors', () => {
  it('names each problem by its path, if it has one', () => {
    const errors = [
      { path: 'surfaces[0].url', message: 'Expected a path' },
      { path: '', message: 'Expected a manifest' },
    ];
    expect(formatManifestErrors(errors, '; ')).toBe(
      'surfaces[0].url: Expected a path; Expected a manifest',
    );
  });
});
