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
});
