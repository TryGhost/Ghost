import { isAppMessage, resolveApiPath, resolveNavigation } from './bridge';

const ORIGIN = 'https://site.example';
const API_ROOT = '/ghost/api/admin';

describe('resolveApiPath', () => {
  it('allows readable resources', () => {
    expect(resolveApiPath('/posts/?limit=5', API_ROOT, ORIGIN)).toBe(
      '/ghost/api/admin/posts/?limit=5',
    );
  });

  it('rejects `..` segments that climb out of the API after normalisation', () => {
    expect(resolveApiPath('/../../settings/', API_ROOT, ORIGIN)).toBeNull();
    expect(resolveApiPath('/posts/../../../', API_ROOT, ORIGIN)).toBeNull();
    expect(resolveApiPath('/%2e%2e/%2e%2e/', API_ROOT, ORIGIN)).toBeNull();
  });

  it('rejects resources that are not readable', () => {
    expect(resolveApiPath('/db/', API_ROOT, ORIGIN)).toBeNull();
    expect(resolveApiPath('/posts/../db/', API_ROOT, ORIGIN)).toBeNull();
  });

  it('rejects other origins and odd paths', () => {
    expect(resolveApiPath('//evil.example/posts/', API_ROOT, ORIGIN)).toBeNull();
    expect(resolveApiPath('posts/', API_ROOT, ORIGIN)).toBeNull();
    expect(resolveApiPath('/posts\\..\\db', API_ROOT, ORIGIN)).toBeNull();
    expect(resolveApiPath(42, API_ROOT, ORIGIN)).toBeNull();
  });
});

describe('resolveNavigation', () => {
  it('allows Admin paths', () => {
    expect(resolveNavigation('/editor/post/abc')).toBe('/editor/post/abc');
    expect(resolveNavigation('/posts?type=scheduled')).toBe('/posts?type=scheduled');
  });

  it('refuses anything that could leave Admin', () => {
    expect(resolveNavigation('https://evil.example')).toBeNull();
    expect(resolveNavigation('//evil.example')).toBeNull();
    expect(resolveNavigation('javascript:alert(1)')).toBeNull();
    expect(resolveNavigation('/\\evil.example')).toBeNull();
  });
});

describe('isAppMessage', () => {
  it('only accepts well-formed messages from apps', () => {
    expect(isAppMessage({ source: 'ghost-app', id: '1', op: 'ready' })).toBe(true);
    expect(isAppMessage({ source: 'other', id: '1', op: 'ready' })).toBe(false);
    expect(isAppMessage('ready')).toBe(false);
  });
});
