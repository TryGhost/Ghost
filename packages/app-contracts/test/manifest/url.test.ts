import { describe, expect, it } from 'vitest';

import { devOptions, errorsOf, manifest, manifestOf, options } from './helpers.ts';

describe('URLs', () => {
  function surfaceUrlError(url: unknown, parseOptions = options) {
    const errors = errorsOf(manifest({ surfaces: [{ type: 'admin_page', url }] }), parseOptions);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.path).toBe('surfaces[0].url');
    return errors[0]?.message;
  }

  it('rejects values that resolve to something other than https', () => {
    expect(surfaceUrlError('javascript:alert(1)')).toBe('Expected an https URL');
    expect(surfaceUrlError('data:text/html,<script>alert(1)</script>')).toBe(
      'Expected an https URL',
    );
    expect(surfaceUrlError('http://podcast.example.com/admin')).toBe('Expected an https URL');
    expect(surfaceUrlError('ftp://podcast.example.com/admin')).toBe('Expected an https URL');
  });

  it('rejects URLs carrying credentials', () => {
    // Built rather than written out, so the secret scanner does not read it as a real one.
    const withPassword = new URL('https://podcast.example.com/admin');
    withPassword.username = 'user';
    withPassword.password = 'example';
    expect(surfaceUrlError(withPassword.href)).toContain('username or password');

    const withUsername = new URL('https://podcast.example.com/admin');
    withUsername.username = 'user';
    expect(surfaceUrlError(withUsername.href)).toContain('username or password');
  });

  it('rejects values that are not usable as a URL', () => {
    expect(surfaceUrlError('')).toContain('Expected a URL');
    expect(surfaceUrlError(42)).toContain('Expected a URL');
    expect(surfaceUrlError('https://')).toContain('Expected a URL');
    expect(surfaceUrlError(`/${'a'.repeat(2000)}`)).toContain('at most 2000');
  });

  it('measures a URL once it is resolved', () => {
    const path = 'a'.repeat(2000 - 'https://podcast.example.com/'.length);
    expect(manifestOf(manifest({ surfaces: [{ type: 'admin_page', url: path }] }))).toBeTruthy();
    expect(surfaceUrlError(`${path}a`)).toContain('at most 2000');
  });

  it('applies the same rules to the icon', () => {
    expect(errorsOf(manifest({ icon: { url: 'data:image/svg+xml,<svg/>' } }))).toEqual([
      { path: 'icon.url', message: 'Expected an https URL' },
    ]);
  });

  it('rejects a surface served from the site or from Admin', () => {
    expect(surfaceUrlError('https://site.example.com/content/files/app.html')).toContain(
      'Ghost itself',
    );
    expect(surfaceUrlError('https://admin.example.com/anything')).toContain('Ghost itself');
  });

  it('rejects relative URLs when the manifest itself is served from Ghost', () => {
    const errors = errorsOf(manifest(), {
      ...options,
      manifestUrl: 'https://site.example.com/content/files/ghost-app.json',
    });
    expect(errors.map((error) => error.path)).toEqual(['icon.url', 'surfaces[0].url']);
  });

  it('rejects an icon served from the site or from Admin', () => {
    expect(
      errorsOf(
        manifest({
          icon: { url: 'https://admin.example.com/ghost/api/admin/site/' },
        }),
      ),
    ).toEqual([{ path: 'icon.url', message: expect.stringContaining('Ghost itself') }]);
  });
});

describe('localhost', () => {
  const localUrls = [
    'http://localhost:8787/admin',
    'https://localhost:8787/admin',
    'http://app.localhost:8787/admin',
    'http://127.0.0.1:8787/admin',
    'http://[::1]:8787/admin',
    'http://localhost.:8787/admin',
    'https://127.0.0.2/admin',
    'https://127.1/admin',
    'https://0.0.0.0/admin',
    'https://[::]/admin',
    'https://[::ffff:127.0.0.1]/admin',
    'https://[::ffff:0.0.0.0]/admin',
  ];

  it('is rejected outside development, over https too', () => {
    for (const url of localUrls) {
      const errors = errorsOf(manifest({ surfaces: [{ type: 'admin_page', url }] }));
      expect(errors).toEqual([
        { path: 'surfaces[0].url', message: expect.stringContaining('development') },
      ]);
    }
  });

  it('is accepted in development', () => {
    for (const url of localUrls) {
      const parsed = manifestOf(manifest({ surfaces: [{ type: 'admin_page', url }] }), devOptions);
      expect(parsed.surfaces[0]?.url).toBe(new URL(url).href);
    }
  });

  it('still requires https for other hosts in development', () => {
    expect(
      errorsOf(
        manifest({ surfaces: [{ type: 'admin_page', url: 'http://podcast.example.com/' }] }),
        devOptions,
      ),
    ).toEqual([{ path: 'surfaces[0].url', message: 'Expected an https URL' }]);
  });

  it('still rejects other schemes in development', () => {
    expect(
      errorsOf(
        manifest({ surfaces: [{ type: 'admin_page', url: 'ftp://localhost/admin' }] }),
        devOptions,
      ),
    ).toEqual([{ path: 'surfaces[0].url', message: 'Expected an http or https URL' }]);
  });

  it('still rejects a surface on the port Ghost is served from', () => {
    expect(
      errorsOf(
        manifest({ surfaces: [{ type: 'admin_page', url: 'http://localhost:2368/app' }] }),
        devOptions,
      ),
    ).toEqual([{ path: 'surfaces[0].url', message: expect.stringContaining('Ghost itself') }]);
  });
});
