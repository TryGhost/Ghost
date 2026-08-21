import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {maxBuilderPromptLength, PromptInput} from './prompt-input';

describe('PromptInput', () => {
    it('keeps and explains a rejected prompt', async () => {
        const onSubmit = vi.fn().mockRejectedValue(new Error('The provider is unavailable.'));
        render(<PromptInput isRunning={false} onStop={vi.fn()} onSubmit={onSubmit} />);
        const input = screen.getByRole('textbox', {name: 'Describe a change'});

        fireEvent.change(input, {target: {value: 'Keep this prompt'}});
        fireEvent.click(screen.getByRole('button', {name: 'Send message'}));

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The provider is unavailable.'));
        expect(input).toHaveValue('Keep this prompt');
    });

    it('rejects an oversized prompt without clearing it', () => {
        const onSubmit = vi.fn();
        render(<PromptInput isRunning={false} onStop={vi.fn()} onSubmit={onSubmit} />);
        const input = screen.getByRole('textbox', {name: 'Describe a change'});
        const prompt = 'A'.repeat(maxBuilderPromptLength + 1);

        fireEvent.change(input, {target: {value: prompt}});
        fireEvent.click(screen.getByRole('button', {name: 'Send message'}));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent('32,000 characters or fewer');
        expect(input).toHaveValue(prompt);
    });

    it('does not submit while an input method composition is active', () => {
        const onSubmit = vi.fn();
        render(<PromptInput isRunning={false} onStop={vi.fn()} onSubmit={onSubmit} />);
        const input = screen.getByRole('textbox', {name: 'Describe a change'});

        fireEvent.change(input, {target: {value: '編集中'}});
        fireEvent.keyDown(input, {key: 'Enter', isComposing: true});

        expect(onSubmit).not.toHaveBeenCalled();
        expect(input).toHaveValue('編集中');
    });

    it('adds and removes attachments next to the prompt', async () => {
        const onAddAttachments = vi.fn().mockResolvedValue(undefined);
        const onRemoveAttachment = vi.fn();
        const {rerender} = render(
            <PromptInput
                attachments={[]}
                isRunning={false}
                onAddAttachments={onAddAttachments}
                onRemoveAttachment={onRemoveAttachment}
                onStop={vi.fn()}
                onSubmit={vi.fn()}
            />
        );
        const file = new File(['name,value\nAlpha,10'], 'report.csv', {type: 'text/csv'});

        fireEvent.change(screen.getByLabelText('Add attachments'), {target: {files: [file]}});
        await waitFor(() => expect(onAddAttachments).toHaveBeenCalledWith([file]));

        rerender(
            <PromptInput
                attachments={[{id: 'attachment-1', name: 'report.csv', kind: 'text', mediaType: 'text/csv', size: file.size}]}
                isRunning={false}
                onAddAttachments={onAddAttachments}
                onRemoveAttachment={onRemoveAttachment}
                onStop={vi.fn()}
                onSubmit={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button', {name: 'Remove report.csv'}));

        expect(onRemoveAttachment).toHaveBeenCalledWith('attachment-1');
    });
});
