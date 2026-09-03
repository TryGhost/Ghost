import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import type { SaveEngineState, SaveError } from '@/editor/engine/save-engine';
import { SessionBanners } from './session-banners';

const noop = () => undefined;

interface BannerOverrides {
  hasUnsavedContent?: () => boolean;
  contentText?: () => string;
  onReload?: () => Promise<boolean>;
}

function renderBanners(state: SaveEngineState, overrides: BannerOverrides = {}) {
  return render(
    <SessionBanners
      contentText={overrides.contentText ?? (() => '')}
      hasUnsavedContent={overrides.hasUnsavedContent ?? (() => false)}
      state={state}
      onDismissReauth={noop}
      onReload={overrides.onReload ?? (() => Promise.resolve(true))}
      onRetryReauth={noop}
      onRetrySave={noop}
    />,
  );
}

const CONFLICT: SaveEngineState = {
  kind: 'conflict',
  intent: 'autosave',
  error: { kind: 'conflict', message: 'Someone else got there first.' },
};

function errored(error: Partial<SaveError>): SaveEngineState {
  return {
    kind: 'error',
    intent: 'autosave',
    error: { kind: 'unknown', message: 'Something went wrong.', ...error },
  };
}

describe('SessionBanners', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it('names a collision and offers both ways out', () => {
    renderBanners(CONFLICT);

    expect(screen.getByRole('alert')).toHaveTextContent('Someone else is editing this post');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy content' })).toBeVisible();
  });

  it('reloads without asking when nothing local is unsaved', () => {
    const onReload = vi.fn(() => Promise.resolve(true));
    renderBanners(CONFLICT, { hasUnsavedContent: () => false, onReload });

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('editor-conflict-reload-confirm')).not.toBeInTheDocument();
  });

  it('confirms before a reload discards local edits, and cancelling reloads nothing', async () => {
    const onReload = vi.fn(() => Promise.resolve(true));
    renderBanners(CONFLICT, { hasUnsavedContent: () => true, onReload });

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));

    expect(await screen.findByTestId('editor-conflict-reload-confirm')).toBeVisible();
    expect(onReload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onReload).not.toHaveBeenCalled();
  });

  it('reloads once the discard is confirmed', async () => {
    const onReload = vi.fn(() => Promise.resolve(true));
    renderBanners(CONFLICT, { hasUnsavedContent: () => true, onReload });

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard and reload' }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('says so when the reload could not read the post', async () => {
    const error = vi.spyOn(toast, 'error').mockReturnValue('');
    renderBanners(CONFLICT, { onReload: () => Promise.resolve(false) });

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));

    await waitFor(() => expect(error).toHaveBeenCalledWith('Couldn’t reload this post'));
  });

  it('copies the unsaved content to the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const success = vi.spyOn(toast, 'success').mockReturnValue('');
    renderBanners(CONFLICT, { contentText: () => 'My post\n\nWords' });

    fireEvent.click(screen.getByRole('button', { name: 'Copy content' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('My post\n\nWords'));
    expect(success).toHaveBeenCalledWith('Content copied');
  });

  it('reports a clipboard the browser refused', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const error = vi.spyOn(toast, 'error').mockReturnValue('');
    renderBanners(CONFLICT);

    fireEvent.click(screen.getByRole('button', { name: 'Copy content' }));

    await waitFor(() => expect(error).toHaveBeenCalledWith('Couldn’t copy your content'));
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
