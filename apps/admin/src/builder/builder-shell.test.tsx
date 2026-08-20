import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router';

import type {BuilderSessionState} from './core/builder-session';
import type {BuilderSelectionContext} from './core/workspace';
import type {CuratedModel} from './models/curated-models';
import {BuilderShell} from './builder-shell';

const models: CuratedModel[] = [
    {
        id: 'gpt-test',
        name: 'GPT Test',
        api: 'openai-responses',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0},
        contextWindow: 1,
        maxTokens: 1
    },
    {
        id: 'claude-test',
        name: 'Claude Test',
        api: 'anthropic-messages',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        reasoning: false,
        input: ['text'],
        cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0},
        contextWindow: 1,
        maxTokens: 1
    }
];

function state(overrides: Partial<BuilderSessionState> = {}): BuilderSessionState {
    return {
        status: 'ready',
        messages: [],
        workspace: {
            revision: 'revision-1',
            dirty: false,
            validation: {valid: true, diagnostics: [], revision: 'revision-1'}
        },
        ...overrides
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
    onSelectModel: vi.fn()
};

describe('BuilderShell', () => {
    it('exposes the preview inline-editing mode when the workspace supports it', () => {
        const onTogglePreviewEditing = vi.fn();
        const {rerender} = render(
            <BuilderShell
                {...defaultProps}
                previewEditing={false}
                onTogglePreviewEditing={onTogglePreviewEditing}
            />,
            {wrapper: MemoryRouter}
        );

        fireEvent.click(screen.getByRole('button', {name: 'Edit preview'}));
        expect(onTogglePreviewEditing).toHaveBeenCalledWith(true);

        rerender(
            <BuilderShell
                {...defaultProps}
                previewEditing
                onTogglePreviewEditing={onTogglePreviewEditing}
            />
        );
        expect(screen.getByRole('button', {name: 'Finish editing preview'})).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders the empty state and submits a prompt', () => {
        const onSubmit = vi.fn();
        render(<BuilderShell {...defaultProps} onSubmit={onSubmit} />, {wrapper: MemoryRouter});

        expect(screen.getByRole('heading', {name: 'What would you like to change?'})).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Back to workspaces'})).toHaveAttribute('href', '/workspaces');
        fireEvent.change(screen.getByRole('textbox', {name: 'Describe a change'}), {target: {value: 'Make the hero brighter'}});
        fireEvent.click(screen.getByRole('button', {name: 'Send message'}));

        expect(onSubmit).toHaveBeenCalledWith('Make the hero brighter');
    });

    it('shows streaming text and groups collapsed tool cards with expansion', () => {
        render(<BuilderShell
            {...defaultProps}
            state={state({
                status: 'running',
                messages: [
                    {id: 'user-1', role: 'user', text: 'Update the hero', status: 'complete'},
                    {
                        id: 'assistant-1',
                        role: 'assistant',
                        text: 'I am updating it now',
                        status: 'pending',
                        toolCalls: [
                            {id: 'tool-1', name: 'read_file', input: {path: 'index.hbs'}, status: 'complete', result: {ok: true, revision: 'revision-1', data: {content: 'Hero'}}},
                            {id: 'tool-2', name: 'replace_in_file', input: {path: 'index.hbs'}, status: 'running'}
                        ]
                    }
                ]
            })}
        />, {wrapper: MemoryRouter});

        expect(screen.getByText('I am updating it now')).toBeInTheDocument();
        expect(screen.getByText('Builder is running')).toBeInTheDocument();
        expect(screen.getByLabelText('Assistant is responding')).toBeInTheDocument();
        const tools = screen.getByText('2 tool actions');
        expect(tools.closest('details')).not.toHaveAttribute('open');
        fireEvent.click(tools);
        expect(screen.getByText('read_file')).toBeVisible();
        expect(screen.getByText('replace_in_file')).toBeVisible();
    });

    it('supports stop, retry, model switching, rewind, and context removal', () => {
        const onStop = vi.fn();
        const onRetry = vi.fn();
        const onRewind = vi.fn();
        const onRemoveSelection = vi.fn();
        const onSelectModel = vi.fn();
        const selection: BuilderSelectionContext = {id: 'index.hbs:4:1', label: 'Hero section'};
        const {rerender} = render(<BuilderShell
            {...defaultProps}
            selection={selection}
            state={state({status: 'running', messages: [{id: 'user-1', role: 'user', text: 'Try this', status: 'complete'}]})}
            onRemoveSelection={onRemoveSelection}
            onRetry={onRetry}
            onRewind={onRewind}
            onSelectModel={onSelectModel}
            onStop={onStop}
        />, {wrapper: MemoryRouter});

        fireEvent.click(screen.getByRole('button', {name: 'Stop generating'}));
        fireEvent.click(screen.getByRole('button', {name: 'Remove Hero section context'}));
        expect(onStop).toHaveBeenCalledOnce();
        expect(onRemoveSelection).toHaveBeenCalledOnce();
        expect(screen.getByRole('combobox', {name: 'Model'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Forget OpenAI key'})).toBeDisabled();

        rerender(<BuilderShell
            {...defaultProps}
            state={state({
                status: 'interrupted',
                error: 'Provider disconnected',
                messages: [
                    {id: 'user-1', role: 'user', text: 'Try this', status: 'complete'},
                    {id: 'assistant-1', role: 'assistant', text: 'Partial', status: 'interrupted'}
                ]
            })}
            onRetry={onRetry}
            onRewind={onRewind}
            onSelectModel={onSelectModel}
        />);
        fireEvent.change(screen.getByRole('combobox', {name: 'Model'}), {target: {value: 'anthropic:claude-test'}});
        fireEvent.click(screen.getByRole('button', {name: 'Retry last message'}));
        fireEvent.click(screen.getByRole('button', {name: 'Return to before this message'}));
        expect(onRetry).toHaveBeenCalledOnce();
        expect(onRewind).toHaveBeenCalledWith('user-1');
        expect(onSelectModel).toHaveBeenCalledWith('anthropic', 'claude-test');
    });

    it('collects a session-only provider key and supports forgetting it', () => {
        const onSaveApiKey = vi.fn();
        const {rerender} = render(<BuilderShell {...defaultProps} hasCredential={false} onSaveApiKey={onSaveApiKey} />, {wrapper: MemoryRouter});

        fireEvent.change(screen.getByLabelText('OpenAI API key'), {target: {value: 'sk-session'}});
        fireEvent.click(screen.getByRole('button', {name: 'Use OpenAI key for this session'}));
        expect(onSaveApiKey).toHaveBeenCalledWith('openai', 'sk-session');

        const onForgetApiKey = vi.fn();
        rerender(<BuilderShell {...defaultProps} hasCredential={true} onForgetApiKey={onForgetApiKey} />);
        fireEvent.click(screen.getByRole('button', {name: 'Forget OpenAI key'}));
        expect(onForgetApiKey).toHaveBeenCalledWith('openai');
    });

    it('shows a workspace load error before the conversation starts', () => {
        render(<BuilderShell
            {...defaultProps}
            state={state({status: 'error', error: 'Theme renderer failed to start'})}
        />, {wrapper: MemoryRouter});

        expect(screen.getByText('Theme renderer failed to start')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Retry last message'})).not.toBeInTheDocument();
    });

    it('prevents a second checkpoint restore while one is pending', () => {
        render(<BuilderShell
            {...defaultProps}
            state={state({
                status: 'restoring',
                messages: [{id: 'user-1', role: 'user', text: 'Try this', status: 'complete'}]
            })}
        />, {wrapper: MemoryRouter});

        expect(screen.getByRole('button', {name: 'Return to before this message'})).toBeDisabled();
    });

    it('confirms before an earlier checkpoint discards later work and restores stable focus', async () => {
        const onRewind = vi.fn(() => Promise.resolve());
        render(<BuilderShell
            {...defaultProps}
            state={state({
                messages: [
                    {id: 'user-1', role: 'user', text: 'First turn', status: 'complete'},
                    {id: 'assistant-1', role: 'assistant', text: 'First result', status: 'complete'},
                    {id: 'user-2', role: 'user', text: 'Second turn', status: 'complete'},
                    {id: 'assistant-2', role: 'assistant', text: 'Second result', status: 'complete'}
                ]
            })}
            onRewind={onRewind}
        />, {wrapper: MemoryRouter});

        const checkpoints = screen.getAllByRole('button', {name: 'Return to before this message'});
        fireEvent.click(checkpoints[0]);

        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Return to this checkpoint?'})).toBeInTheDocument();
        expect(onRewind).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Keep current work'}));
        expect(onRewind).not.toHaveBeenCalled();

        fireEvent.click(checkpoints[0]);
        fireEvent.click(screen.getByRole('button', {name: 'Return and discard later work'}));
        expect(onRewind).toHaveBeenCalledWith('user-1');
        await waitFor(() => expect(screen.getByRole('textbox', {name: 'Describe a change'})).toHaveFocus());
        const firstAnnouncement = screen.getByRole('status');
        expect(firstAnnouncement).toHaveTextContent('Returned to the selected checkpoint.');

        fireEvent.click(checkpoints[1]);
        expect(onRewind).toHaveBeenCalledWith('user-2');
        await waitFor(() => expect(screen.getByRole('textbox', {name: 'Describe a change'})).toHaveFocus());
        expect(screen.getByRole('status')).not.toBe(firstAnnouncement);
    });

    it('focuses provider setup after rewind when the composer has no credential', async () => {
        const onRewind = vi.fn(() => Promise.resolve());
        render(<BuilderShell
            {...defaultProps}
            hasCredential={false}
            state={state({messages: [{id: 'user-1', role: 'user', text: 'First turn', status: 'complete'}]})}
            onRewind={onRewind}
        />, {wrapper: MemoryRouter});

        fireEvent.click(screen.getByRole('button', {name: 'Return to before this message'}));

        await waitFor(() => expect(screen.getByLabelText('OpenAI API key')).toHaveFocus());
    });

    it('shows when the workspace has unpublished changes', () => {
        render(<BuilderShell
            {...defaultProps}
            state={state({workspace: {revision: 'revision-2', dirty: true, validation: {valid: true, diagnostics: [], revision: 'revision-2'}}})}
        />, {wrapper: MemoryRouter});

        expect(screen.getByText('Unsaved')).toBeInTheDocument();
    });

    it('keeps the header compact when status indicators are visible', () => {
        render(<BuilderShell
            {...defaultProps}
            state={state({
                status: 'running',
                workspace: {revision: 'revision-2', dirty: true, validation: {valid: true, diagnostics: [], revision: 'revision-2'}}
            })}
        />, {wrapper: MemoryRouter});

        expect(screen.getByRole('heading', {name: 'Casper'})).toHaveClass('truncate');
        expect(screen.getByText('Unsaved')).toHaveClass('hidden', 'sm:block');
        expect(screen.getByText('Running')).toHaveClass('hidden', 'sm:block');
    });
});
