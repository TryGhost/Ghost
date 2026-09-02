import { renderHook } from '@testing-library/react';
import { useEditorSessionKey } from './use-editor-session';

const location = vi.fn<() => { key: string; state: unknown }>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useLocation: () => location(),
  useNavigate: () => () => undefined,
}));

describe('useEditorSessionKey', () => {
  const keyFor = (entry: { key: string; state?: unknown }) => {
    location.mockReturnValue({ key: entry.key, state: entry.state ?? null });
    return renderHook(() => useEditorSessionKey()).result.current;
  };

  it('identifies a session by the history entry it opened on', () => {
    expect(keyFor({ key: 'abc' })).toBe('abc');
  });

  it('carries the session across the URL a create replaces', () => {
    const opened = keyFor({ key: 'abc' });
    const afterCreate = keyFor({ key: 'def', state: { editorSession: opened } });

    expect(afterCreate).toBe(opened);
  });

  it('starts a new session for a navigation that carries nothing', () => {
    expect(keyFor({ key: 'ghi' })).not.toBe(keyFor({ key: 'jkl' }));
  });

  it('ignores history state that is not a session marker', () => {
    expect(keyFor({ key: 'abc', state: { from: '/posts' } })).toBe('abc');
  });
});
