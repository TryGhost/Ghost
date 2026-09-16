import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { useState } from 'react';

import type { BuilderSessionState } from './core/builder-session';
import type { BuilderSelectionContext } from './core/workspace';
import type { CuratedModel } from './models/curated-models';
import { BuilderShell } from './builder-shell';

const models: CuratedModel[] = [
  {
    id: 'gpt-test',
    name: 'GPT Test',
    api: 'openai-responses',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1,
    maxTokens: 1,
  },
  {
    id: 'claude-test',
    name: 'Claude Test',
    api: 'anthropic-messages',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1,
    maxTokens: 1,
  },
];

function state(overrides: Partial<BuilderSessionState> = {}): BuilderSessionState {
  return {
    status: 'ready',
    messages: [],
    workspace: {
      revision: 'revision-1',
      dirty: false,
      validation: { valid: true, diagnostics: [], revision: 'revision-1' },
    },
    ...overrides,
  };
}

const defaultProps = {
  state: state(),
  title: 'Casper',
  backTo: '/workspaces',
  backLabel: 'Back to workspaces',
  provider: 'openai' as const,
  modelId: 'gpt-test',
  models,
  hasCredential: true,
  preview: <div>Theme preview</div>,
  onSubmit: vi.fn(),
  onStop: vi.fn(),
  onRetry: vi.fn(),
  onRewind: vi.fn(),
  onRemoveSelection: vi.fn(),
  onSaveApiKey: vi.fn(),
  onForgetApiKey: vi.fn(),
  onSelectModel: vi.fn(),
};

const StatefulPublishAction = () => {
  const [open, setOpen] = useState(false);

  return open ? (
    <input aria-label="Theme copy name" defaultValue="casper-edited" />
  ) : (
    <button type="button" onClick={() => setOpen(true)}>
      Publish changes
    </button>
  );
};

describe('BuilderShell', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
      writable: true,
    });
  });

  it('wraps the canvas in preview navigation and explicit selection and editing modes', () => {
    const onNavigatePreview = vi.fn();
    const onPreviewBack = vi.fn();
    const onPreviewForward = vi.fn();
    const onSetPreviewMode = vi.fn();
    render(
      <BuilderShell
        {...defaultProps}
        previewCanGoForward={false}
        previewMode="browse"
        previewUrl="http://localhost:2368/about/"
        publishAction={<button type="button">Publish test</button>}
        previewCanGoBack
        onNavigatePreview={onNavigatePreview}
        onPreviewBack={onPreviewBack}
        onPreviewForward={onPreviewForward}
        onSetPreviewMode={onSetPreviewMode}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByRole('textbox', { name: 'Preview address' })).toHaveValue(
      'http://localhost:2368/about/',
    );
    expect(screen.getByRole('button', { name: 'Back in preview' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Forward in preview' })).toBeDisabled();
    expect(
      screen
        .getByRole('button', { name: 'Publish test' })
        .closest('[aria-label="Builder actions"]'),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back in preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select preview content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit preview' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Preview address' }), {
      target: { value: '/archive/' },
    });
    fireEvent.submit(screen.getByRole('textbox', { name: 'Preview address' }).closest('form')!);

    expect(onPreviewBack).toHaveBeenCalledOnce();
    expect(onPreviewForward).not.toHaveBeenCalled();
    expect(onSetPreviewMode).toHaveBeenNthCalledWith(1, 'select');
    expect(onSetPreviewMode).toHaveBeenNthCalledWith(2, 'edit');
    expect(onNavigatePreview).toHaveBeenCalledWith('/archive/');
  });

  it('keeps the publish action mounted across the responsive breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
      writable: true,
    });
    render(
      <BuilderShell
        {...defaultProps}
        publishAction={<StatefulPublishAction />}
        onSetPreviewMode={vi.fn()}
      />,
      { wrapper: MemoryRouter },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish changes' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Theme copy name' }), {
      target: { value: 'my-custom-theme' },
    });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600, writable: true });
    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('textbox', { name: 'Theme copy name' })).toHaveValue('my-custom-theme');
    expect(screen.queryByRole('textbox', { name: 'Preview address' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Select preview content' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));

    expect(screen.getByRole('textbox', { name: 'Preview address' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select preview content' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back in preview' })).not.toBeInTheDocument();
  });

  it('configures the shared shell as a single-page Artifact preview', () => {
    const onSetPreviewMode = vi.fn();
    render(
      <BuilderShell
        {...defaultProps}
        backAction={<button type="button">Cancel artifact</button>}
        preview={<div>Artifact preview</div>}
        previewAddress={false}
        previewEdit={false}
        previewHistory={false}
        previewMode="browse"
        previewResponsive
        onSetPreviewMode={onSetPreviewMode}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.queryByRole('textbox', { name: 'Preview address' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back in preview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit preview' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select preview content' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Desktop preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Mobile preview' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Cancel artifact' })).toBeInTheDocument();
  });

  it('explains a preview address that cannot be opened', async () => {
    const onNavigatePreview = vi.fn().mockResolvedValue('Preview links need to stay on this site.');
    render(
      <BuilderShell
        {...defaultProps}
        previewUrl="http://localhost:2368/"
        onNavigatePreview={onNavigatePreview}
      />,
      { wrapper: MemoryRouter },
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Preview address' }), {
      target: { value: 'https://example.com/' },
    });
    fireEvent.submit(screen.getByRole('textbox', { name: 'Preview address' }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Preview links need to stay on this site.',
    );
    expect(screen.getByRole('textbox', { name: 'Preview address' })).toHaveValue(
      'http://localhost:2368/',
    );
  });

  it('renders the empty state and submits a prompt', () => {
    const onSubmit = vi.fn();
    render(<BuilderShell {...defaultProps} onSubmit={onSubmit} />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole('heading', { name: 'What would you like to change?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to workspaces' })).toHaveAttribute(
      'href',
      '/workspaces',
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Describe a change' }), {
      target: { value: 'Make the hero brighter' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSubmit).toHaveBeenCalledWith('Make the hero brighter');
  });

  it('shows tool progress before the streamed final response', () => {
    render(
      <BuilderShell
        {...defaultProps}
        state={state({
          status: 'running',
          messages: [
            { id: 'user-1', role: 'user', text: 'Update the hero', status: 'complete' },
            {
              id: 'assistant-1',
              role: 'assistant',
              text: '## Done\n\nI am **updating** it now.',
              status: 'pending',
              toolCalls: [
                {
                  id: 'tool-1',
                  name: 'read_file',
                  input: { path: 'index.hbs' },
                  status: 'complete',
                  result: { ok: true, revision: 'revision-1', data: { content: 'Hero' } },
                },
                {
                  id: 'tool-2',
                  name: 'replace_in_file',
                  input: { path: 'index.hbs' },
                  status: 'running',
                },
              ],
            },
          ],
        })}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Builder is running' })).toBeInTheDocument();
    expect(screen.getByText('Assistant is responding')).toHaveClass('sr-only');
    expect(screen.getByText('Update the hero').closest('article')?.parentElement).toHaveClass(
      'gap-4',
    );
    const tools = screen
      .getAllByText('Editing the template')
      .find((element) => element.closest('summary'))!;
    expect(tools).toHaveClass('builder-shimmer');
    expect(tools.closest('.gap-4')).not.toBeNull();
    expect(
      tools.compareDocumentPosition(screen.getByRole('heading', { name: 'Done' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(tools.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(tools);
    expect(screen.getByText('Inspecting the template')).toBeVisible();
    expect(screen.getAllByText('Editing the template')).toHaveLength(2);
    expect(screen.queryByText('read_file')).not.toBeInTheDocument();
    expect(screen.queryByText('replace_in_file')).not.toBeInTheDocument();
  });

  it('supports stop, retry, model switching, rewind, and context removal', () => {
    const onStop = vi.fn();
    const onRetry = vi.fn();
    const onRewind = vi.fn();
    const onRemoveSelection = vi.fn();
    const onSelectModel = vi.fn();
    const selection: BuilderSelectionContext = { id: 'index.hbs:4:1', label: 'Hero section' };
    const { rerender } = render(
      <BuilderShell
        {...defaultProps}
        selection={selection}
        state={state({
          status: 'running',
          messages: [{ id: 'user-1', role: 'user', text: 'Try this', status: 'complete' }],
        })}
        onRemoveSelection={onRemoveSelection}
        onRetry={onRetry}
        onRewind={onRewind}
        onSelectModel={onSelectModel}
        onStop={onStop}
      />,
      { wrapper: MemoryRouter },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Hero section context' }));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onRemoveSelection).toHaveBeenCalledOnce();
    expect(screen.getByRole('combobox', { name: 'Choose model: GPT Test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Forget OpenAI key' })).toBeDisabled();
    expect(screen.getByText('Theme preview').closest('[inert]')).toBeInTheDocument();

    rerender(
      <BuilderShell
        {...defaultProps}
        state={state({
          status: 'interrupted',
          error: 'Provider disconnected',
          messages: [
            { id: 'user-1', role: 'user', text: 'Try this', status: 'complete' },
            { id: 'assistant-1', role: 'assistant', text: 'Partial', status: 'interrupted' },
          ],
        })}
        onRetry={onRetry}
        onRewind={onRewind}
        onSelectModel={onSelectModel}
      />,
    );
    const modelPicker = screen.getByRole('combobox', { name: 'Choose model: GPT Test' });
    expect(modelPicker.closest('form')).not.toBeNull();
    Element.prototype.scrollIntoView = vi.fn();
    fireEvent.click(modelPicker);
    fireEvent.click(screen.getByText('Claude Test'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry last message' }));
    const undo = screen.getByRole('button', { name: 'Undo this message' });
    expect(undo).not.toHaveTextContent('Undo this message');
    expect(undo.parentElement).toHaveClass(
      'absolute',
      '-bottom-6',
      'right-0',
      'opacity-0',
      'group-hover:opacity-100',
      'group-focus-within:opacity-100',
      '[@media(hover:none)]:opacity-100',
    );
    expect(undo).toHaveClass('size-6', '[&_svg]:size-3');
    expect(undo.querySelector('.lucide-undo-2')).not.toBeNull();
    fireEvent.click(undo);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRewind).toHaveBeenCalledWith('user-1');
    expect(onSelectModel).toHaveBeenCalledWith('anthropic', 'claude-test');
  });

  it('collects a session-only provider key and supports forgetting it', () => {
    const onSaveApiKey = vi.fn();
    const { rerender } = render(
      <BuilderShell {...defaultProps} hasCredential={false} onSaveApiKey={onSaveApiKey} />,
      { wrapper: MemoryRouter },
    );

    fireEvent.change(screen.getByLabelText('OpenAI API key'), { target: { value: 'sk-session' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use OpenAI key for this session' }));
    expect(onSaveApiKey).toHaveBeenCalledWith('openai', 'sk-session');

    const onForgetApiKey = vi.fn();
    rerender(
      <BuilderShell {...defaultProps} hasCredential={true} onForgetApiKey={onForgetApiKey} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Forget OpenAI key' }));
    expect(onForgetApiKey).toHaveBeenCalledWith('openai');
  });

  it('shows a workspace load error before the conversation starts', () => {
    render(
      <BuilderShell
        {...defaultProps}
        state={state({ status: 'error', error: 'Theme renderer failed to start' })}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByText('Theme renderer failed to start')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry last message' })).not.toBeInTheDocument();
  });

  it('prevents a second checkpoint restore while one is pending', () => {
    render(
      <BuilderShell
        {...defaultProps}
        state={state({
          status: 'restoring',
          messages: [{ id: 'user-1', role: 'user', text: 'Try this', status: 'complete' }],
        })}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByRole('button', { name: 'Undo this message' })).toBeDisabled();
  });

  it('confirms before an earlier checkpoint discards later work and restores stable focus', async () => {
    const onRewind = vi.fn(() => Promise.resolve());
    render(
      <BuilderShell
        {...defaultProps}
        state={state({
          messages: [
            { id: 'user-1', role: 'user', text: 'First turn', status: 'complete' },
            { id: 'assistant-1', role: 'assistant', text: 'First result', status: 'complete' },
            { id: 'user-2', role: 'user', text: 'Second turn', status: 'complete' },
            { id: 'assistant-2', role: 'assistant', text: 'Second result', status: 'complete' },
          ],
        })}
        onRewind={onRewind}
      />,
      { wrapper: MemoryRouter },
    );

    const checkpoints = screen.getAllByRole('button', { name: 'Undo this message' });
    fireEvent.click(checkpoints[0]);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Undo this message?' })).toBeInTheDocument();
    expect(onRewind).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep current work' }));
    expect(onRewind).not.toHaveBeenCalled();

    fireEvent.click(checkpoints[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo and discard later work' }));
    expect(onRewind).toHaveBeenCalledWith('user-1');
    const prompt = screen.getByRole('textbox', { name: 'Describe a change' });
    await waitFor(() => expect(prompt).toHaveFocus());
    expect(prompt).toHaveValue('First turn');
    const firstAnnouncement = screen.getByRole('status');
    expect(firstAnnouncement).toHaveTextContent('Undid the selected message.');

    fireEvent.click(checkpoints[1]);
    expect(onRewind).toHaveBeenCalledWith('user-2');
    await waitFor(() => expect(prompt).toHaveFocus());
    expect(prompt).toHaveValue('First turn');
    expect(screen.getByRole('status')).not.toBe(firstAnnouncement);
  });

  it('focuses provider setup after rewind when the composer has no credential', async () => {
    const onRewind = vi.fn(() => Promise.resolve());
    render(
      <BuilderShell
        {...defaultProps}
        hasCredential={false}
        state={state({
          messages: [{ id: 'user-1', role: 'user', text: 'First turn', status: 'complete' }],
        })}
        onRewind={onRewind}
      />,
      { wrapper: MemoryRouter },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo this message' }));

    await waitFor(() => expect(screen.getByLabelText('OpenAI API key')).toHaveFocus());
  });

  it('shows when the workspace has unpublished changes', () => {
    render(
      <BuilderShell
        {...defaultProps}
        state={state({
          workspace: {
            revision: 'revision-2',
            dirty: true,
            validation: { valid: true, diagnostics: [], revision: 'revision-2' },
          },
        })}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByRole('status', { name: 'Unsaved changes' })).toBeInTheDocument();
  });

  it('keeps the header compact when status indicators are visible', () => {
    render(
      <BuilderShell
        {...defaultProps}
        state={state({
          status: 'running',
          workspace: {
            revision: 'revision-2',
            dirty: true,
            validation: { valid: true, diagnostics: [], revision: 'revision-2' },
          },
        })}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByRole('heading', { name: 'Casper' })).toHaveClass('truncate');
    expect(screen.getByRole('status', { name: 'Unsaved changes' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Builder is running' })).toBeInTheDocument();
  });
});
