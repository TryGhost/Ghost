import {useState} from 'react';

import {Button, Textarea} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import type {FormEvent, KeyboardEvent, ReactNode, Ref} from 'react';

export const maxBuilderPromptLength = 32_000;

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export const PromptInput = ({disabled, isRunning, context, inputRef, modelPicker, onRemoveContext, onSubmit, onStop}: {
    disabled?: boolean;
    isRunning: boolean;
    context?: {label: string} | null;
    inputRef?: Ref<HTMLTextAreaElement>;
    modelPicker?: ReactNode;
    onRemoveContext?: () => void;
    onSubmit: (value: string) => void | Promise<unknown>;
    onStop: () => void;
}) => {
    const [value, setValue] = useState('');
    const [submissionError, setSubmissionError] = useState<string>();

    const submit = (event?: FormEvent) => {
        event?.preventDefault();
        const text = value.trim();
        if (!text || disabled || isRunning) {
            return;
        }
        if (text.length > maxBuilderPromptLength) {
            setSubmissionError('A Builder message must be 32,000 characters or fewer.');
            return;
        }
        setSubmissionError(undefined);
        let submission: void | Promise<unknown>;
        try {
            submission = onSubmit(text);
        } catch (error) {
            setSubmissionError(errorMessage(error));
            return;
        }
        setValue('');
        void Promise.resolve(submission).catch((error) => {
            setValue(current => current || text);
            setSubmissionError(errorMessage(error));
        });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing) {
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
        }
    };

    return (
        <form className='rounded-xl bg-surface-elevated p-2 shadow-sm' onSubmit={submit}>
            <Stack gap='sm'>
                {context && (
                    <Inline>
                        <Button aria-label={`Remove ${context.label} context`} size='sm' type='button' variant='outline' onClick={onRemoveContext}>
                            <LucideIcon.MousePointer2 aria-hidden='true' />
                            {context.label}
                            <LucideIcon.X aria-hidden='true' />
                        </Button>
                    </Inline>
                )}
                <Textarea
                    ref={inputRef}
                    aria-invalid={Boolean(submissionError)}
                    aria-label='Describe a change'
                    className='min-h-20 resize-none'
                    disabled={disabled}
                    maxLength={maxBuilderPromptLength}
                    placeholder='Describe what you want to change…'
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value);
                        setSubmissionError(undefined);
                    }}
                    onKeyDown={handleKeyDown}
                />
                {submissionError && <Text className='text-destructive' role='alert' size='sm'>{submissionError}</Text>}
                <Inline align='center' justify={modelPicker ? 'between' : 'end'}>
                    {modelPicker}
                    {isRunning ? (
                        <Button aria-label='Stop generating' size='icon' type='button' variant='outline' onClick={onStop}>
                            <LucideIcon.Square aria-hidden='true' />
                        </Button>
                    ) : (
                        <Button aria-label='Send message' disabled={disabled || !value.trim()} size='icon' type='submit'>
                            <LucideIcon.ArrowUp aria-hidden='true' />
                        </Button>
                    )}
                </Inline>
            </Stack>
        </form>
    );
};
