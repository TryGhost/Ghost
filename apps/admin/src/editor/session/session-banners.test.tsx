import { render, screen } from '@testing-library/react';
import type { SaveEngineState, SaveError } from '@/editor/engine/save-engine';
import { SessionBanners } from './session-banners';

const noop = () => undefined;

function renderBanners(state: SaveEngineState) {
  return render(
    <SessionBanners state={state} onDismissReauth={noop} onRetryReauth={noop} onRetrySave={noop} />,
  );
}

function errored(error: Partial<SaveError>): SaveEngineState {
  return {
    kind: 'error',
    intent: 'autosave',
    error: { kind: 'unknown', message: 'Something went wrong.', ...error },
  };
}

describe('SessionBanners', () => {
  it('says nothing while saving is working', () => {
    const { container } = renderBanners({ kind: 'idle' });

    expect(container).toBeEmptyDOMElement();
  });

  it.each<[string, SaveEngineState]>([
    ['saving', { kind: 'saving', intent: 'autosave' }],
    ['debouncing', { kind: 'debouncing' }],
    ['disposed', { kind: 'disposed' }],
  ])('stays quiet in the %s state', (_label, state) => {
    const { container } = renderBanners(state);

    expect(container).toBeEmptyDOMElement();
  });

  it('offers a retry in place when the session expired', () => {
    renderBanners({ kind: 'reauth-pending', intent: 'explicit' });

    expect(screen.getByRole('alert')).toHaveTextContent('Your session expired');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });

  it('names a collision', () => {
    renderBanners({
      kind: 'conflict',
      intent: 'autosave',
      error: { kind: 'conflict', message: 'Someone else got there first.' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Someone else is editing this post');
  });

  it('explains an unreachable server rather than repeating the transport error', () => {
    renderBanners(errored({ kind: 'transport', message: 'Failed to fetch' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t reach the server');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Failed to fetch');
  });

  it('repeats a session failure the writer already dismissed', () => {
    renderBanners(errored({ kind: 'session-invalid', message: 'Unauthorized' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Your session expired');
  });

  it.each<[SaveError['kind']]>([['validation'], ['host-limit'], ['unknown']])(
    'shows what the server said about a %s failure',
    (kind) => {
      renderBanners(errored({ kind, message: 'Title cannot be longer than 255 characters.' }));

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Title cannot be longer than 255 characters.',
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    },
  );
});
