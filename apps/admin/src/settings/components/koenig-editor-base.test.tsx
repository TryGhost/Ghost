import * as Sentry from '@sentry/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import KoenigEditorBase from './koenig-editor-base';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

const LEXICAL_ERROR = vi.hoisted(() => new Error('lexical exploded'));

vi.mock('@/utils/fetch-koenig-lexical', () => ({
  fetchKoenigLexical: () =>
    Promise.resolve({
      version: '1.2.3',
      KoenigComposer: ({
        children,
        onError,
      }: {
        children: ReactNode;
        onError: (error: unknown) => void;
      }) => (
        <div>
          <button type="button" onClick={() => onError(LEXICAL_ERROR)}>
            Fail
          </button>
          {children}
        </div>
      ),
      KoenigComposableEditor: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      EmojiPickerPlugin: () => null,
    }),
}));

describe('KoenigEditorBase', () => {
  it('reports Lexical errors with the version of the Koenig it loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<KoenigEditorBase>{() => null}</KoenigEditorBase>);

    fireEvent.click(await screen.findByRole('button', { name: 'Fail' }));

    expect(Sentry.captureException).toHaveBeenCalledWith(LEXICAL_ERROR, {
      tags: { lexical: true },
      contexts: { koenig: { version: '1.2.3' } },
    });
  });
});
