import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {ProviderSetup} from './provider-setup';

describe('ProviderSetup', () => {
    it('clears an unsaved credential when the provider changes', () => {
        const {rerender} = render(<ProviderSetup connected={false} provider='openai' onForget={vi.fn()} onSave={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('OpenAI API key'), {target: {value: 'openai-secret'}});

        rerender(<ProviderSetup connected={false} provider='anthropic' onForget={vi.fn()} onSave={vi.fn()} />);

        expect(screen.getByLabelText('Anthropic API key')).toHaveValue('');
    });

    it('imports Codex auth JSON and reports invalid files without clearing them', () => {
        const onSave = vi.fn();
        render(<ProviderSetup connected={false} provider='openai-codex' onForget={vi.fn()} onSave={onSave} />);
        const input = screen.getByLabelText('Codex auth.json');

        fireEvent.change(input, {target: {value: '{"tokens":{"access_token":"session-access","refresh_token":"never-store"}}'}});
        fireEvent.click(screen.getByRole('button', {name: 'Use Codex session'}));

        expect(onSave).toHaveBeenCalledWith('openai-codex', 'session-access');
        expect(input).toHaveValue('');
    });

    it('keeps invalid Codex auth JSON available for correction', () => {
        const onSave = vi.fn();
        render(<ProviderSetup connected={false} provider='openai-codex' onForget={vi.fn()} onSave={onSave} />);
        const input = screen.getByLabelText('Codex auth.json');

        fireEvent.change(input, {target: {value: '{"tokens":{}}'}});
        fireEvent.click(screen.getByRole('button', {name: 'Use Codex session'}));

        expect(onSave).not.toHaveBeenCalled();
        expect(input).toHaveValue('{"tokens":{}}');
        expect(screen.getByRole('alert')).toHaveTextContent('Codex access token');
    });
});
