import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { editorSaveError, editorStatus } from '@tryghost/test-data/selectors/editor';
import type { SaveEngineState, SaveError } from './engine/save-engine';
import { EditorStatus, RecipientCount } from './editor-status';
import { UNEXPECTED_MESSAGE } from './publish/completion-message';
import { reportShownAlert } from './report-error';

vi.mock('./use-editor-settings', () => ({ useSiteTimezone: () => 'Etc/UTC' }));
vi.mock('./report-error', () => ({ reportShownAlert: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/api/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/api/config')>()),
  useBrowseConfig: () => ({ data: undefined }),
}));

const mocks = vi.hoisted(() => ({
  useMembersCount: vi.fn(() => ({ count: null })),
}));

vi.mock('@tryghost/admin-x-framework/api/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/members')>();
  return {
    ...actual,
    useMembersCount: mocks.useMembersCount,
  };
});

// The status line shares its count key with the publish flow, so the refetches
// it initiates have to opt out of the session-expiry redirect too.
const OPTED_OUT = { requestOptions: { sessionExpiryRedirect: false } };

describe('EditorStatus', () => {
  it('starts the saving indicator only after preparation succeeds', () => {
    const { rerender } = render(
      <EditorStatus state={{ kind: 'preparing', intent: 'autosave' }} isDirty />,
    );
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();

    rerender(<EditorStatus state={{ kind: 'idle' }} isDirty />);
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();

    rerender(<EditorStatus state={{ kind: 'saving', intent: 'autosave' }} isDirty />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('shows nothing for a post that has never been saved', () => {
    const { container, rerender } = render(<EditorStatus state={{ kind: 'idle' }} isDirty />);
    expect(container).toBeEmptyDOMElement();

    rerender(<EditorStatus isDirty={false} state={{ kind: 'idle' }} />);
    expect(container).toBeEmptyDOMElement();

    rerender(
      <EditorStatus isDirty={false} record={{ status: 'draft' }} state={{ kind: 'idle' }} />,
    );
    expect(screen.getByText('Draft - Saved')).toBeInTheDocument();
  });

  it('reports a first save that failed', () => {
    render(
      <EditorStatus
        state={{
          kind: 'error',
          intent: 'autosave',
          error: { kind: 'validation', message: 'Title is too long.' },
        }}
        isDirty
      />,
    );
    expect(screen.getByText('Title is too long.')).toBeInTheDocument();
  });
});

function failed(error: SaveError, intent: 'explicit' | 'publish' = 'explicit'): SaveEngineState {
  return { kind: 'error', intent, error };
}

describe('EditorStatus reporting a failed save', () => {
  beforeEach(() => {
    vi.mocked(reportShownAlert).mockClear();
  });

  it('replaces the status with the failure, in the status line, with a retry', () => {
    const onRetrySave = vi.fn();
    render(
      <EditorStatus
        record={{ status: 'draft' }}
        state={failed({ kind: 'transport', message: 'Failed to fetch' })}
        isDirty
        onRetrySave={onRetrySave}
      />,
    );

    const status = screen.getByTestId(editorStatus);
    const problem = screen.getByTestId(editorSaveError);
    expect(status).toContainElement(problem);
    expect(status).not.toHaveTextContent('Draft');
    expect(problem).toHaveClass('text-destructive');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Couldn’t reach the server. Check your connection and try again.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });

  it('names the rule a refused save broke, with no retry', () => {
    render(
      <EditorStatus
        record={{ status: 'draft' }}
        state={failed({ kind: 'validation', message: 'At least one author is required.' })}
        isDirty
        onRetrySave={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('At least one author is required.');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('offers no retry for a failed publish, which is retried from the publish flow', () => {
    render(
      <EditorStatus
        record={{ status: 'draft' }}
        state={failed({ kind: 'unknown', message: 'Publishing failed.', cause: {} }, 'publish')}
        isDirty
        onRetrySave={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Publishing failed.');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('links the upgrade a host limit asks for', () => {
    render(
      <EditorStatus
        record={{ status: 'draft' }}
        state={failed({
          kind: 'host-limit',
          message: 'Your plan does not support this, please upgrade.',
          cause: {},
        })}
        isDirty
        onRetrySave={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'please upgrade' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a generic reason rather than an exception thrown in the browser', () => {
    const cause = new TypeError("Cannot read properties of undefined (reading 'x')");
    render(
      <EditorStatus
        record={{ status: 'draft' }}
        state={failed({ kind: 'unknown', message: cause.message, cause })}
        isDirty
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(UNEXPECTED_MESSAGE);
    expect(screen.getByRole('alert')).not.toHaveTextContent('Cannot read properties');
  });

  it('reports a failure once, by the text shown, not per render', () => {
    const error: SaveError = { kind: 'transport', message: 'Offline' };
    const state = failed(error);
    const { rerender } = render(
      <EditorStatus record={{ status: 'draft' }} state={state} isDirty />,
    );
    rerender(<EditorStatus isDirty={false} record={{ status: 'draft' }} state={state} />);

    expect(reportShownAlert).toHaveBeenCalledTimes(1);
    expect(reportShownAlert).toHaveBeenCalledWith(
      'Couldn’t reach the server. Check your connection and try again.',
      error,
    );
  });
});

describe('RecipientCount', () => {
  it('keeps descriptive copy when the member count is unavailable', () => {
    const filter = 'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)';

    render(<RecipientCount filter={filter} segment="status:free,status:-free" />);

    expect(screen.getByText('all members')).toBeInTheDocument();
    expect(mocks.useMembersCount).toHaveBeenCalledWith(filter, OPTED_OUT);
  });
});
