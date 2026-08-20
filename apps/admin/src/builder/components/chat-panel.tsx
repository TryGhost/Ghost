import {useRef, useState} from 'react';

import {Button} from '@tryghost/shade/components';
import {Box, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import {Checkpoint} from './ai-elements/checkpoint';
import {Conversation, ConversationContent, ConversationEmptyState} from './ai-elements/conversation';
import {Message, MessageContent} from './ai-elements/message';
import {ModelSelector} from './ai-elements/model-selector';
import {PromptInput} from './ai-elements/prompt-input';
import {ToolGroup} from './ai-elements/tool';
import {ProviderSetup} from './provider-setup';

import type {BuilderSessionState} from '@/builder/core/builder-session';
import type {BuilderSelectionContext} from '@/builder/core/workspace';
import type {BuilderProvider, CuratedModel} from '@/builder/models/curated-models';

export type ChatPanelProps = {
    state: BuilderSessionState;
    provider: BuilderProvider;
    modelId: string;
    models: readonly CuratedModel[];
    hasCredential: boolean;
    selection?: BuilderSelectionContext | null;
    onSubmit: (value: string) => void | Promise<unknown>;
    onStop: () => void;
    onRetry: () => void;
    onRewind: (messageId: string) => void | Promise<void>;
    onRemoveSelection: () => void;
    onSaveApiKey: (provider: BuilderProvider, key: string) => void;
    onForgetApiKey: (provider: BuilderProvider) => void;
    onSelectModel: (provider: BuilderProvider, modelId: string) => void;
    interactionDisabled?: boolean;
};

export const ChatPanel = ({state, provider, modelId, models, hasCredential, selection, onSubmit, onStop, onRetry, onRewind, onRemoveSelection, onSaveApiKey, onForgetApiKey, onSelectModel, interactionDisabled = false}: ChatPanelProps) => {
    const isRunning = state.status === 'running';
    const controlsDisabled = interactionDisabled || isRunning || state.status === 'publishing';
    const canPrompt = !interactionDisabled && (state.status === 'ready' || state.status === 'interrupted');
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const providerKeyRef = useRef<HTMLInputElement>(null);
    const rewindSequence = useRef(0);
    const [rewindAnnouncement, setRewindAnnouncement] = useState<{id: number; message: string} | null>(null);

    const returnToCheckpoint = async (messageId: string) => {
        try {
            await onRewind(messageId);
            rewindSequence.current += 1;
            setRewindAnnouncement({id: rewindSequence.current, message: 'Returned to the selected checkpoint.'});
            if (hasCredential) {
                promptRef.current?.focus();
            } else {
                providerKeyRef.current?.focus();
            }
        } catch {
            // The session exposes restore failures in its state; keep focus where the error can be reviewed.
        }
    };

    return (
        <Stack className='size-full min-h-0 bg-background' gap='none'>
            <Conversation>
                <ConversationContent className='min-h-full'>
                    {state.messages.length === 0 ? (
                        <ConversationEmptyState
                            description='Describe a change and Builder will inspect, edit, and verify the workspace preview.'
                            icon={<LucideIcon.Sparkles aria-hidden='true' className='size-8 text-muted-foreground' />}
                            title='What would you like to change?'
                        />
                    ) : (
                        <>
                        {state.messages.map((message, messageIndex) => (
                            <Message key={message.id} from={message.role}>
                                <Stack className={message.role === 'user' ? 'items-end' : ''} gap='sm'>
                                    <MessageContent from={message.role} status={message.status}>
                                        {message.text || (message.role === 'assistant' && isRunning ? 'Working…' : '')}
                                    </MessageContent>
                                    {message.toolCalls?.length ? <ToolGroup toolCalls={message.toolCalls} /> : null}
                                    {message.role === 'assistant' && message.status === 'pending' && (
                                        <span aria-label='Assistant is responding' className='inline-flex text-muted-foreground'>
                                            <LucideIcon.LoaderCircle aria-hidden='true' className='size-4 animate-spin motion-reduce:animate-none' />
                                        </span>
                                    )}
                                    {message.role === 'user' && (
                                        <Checkpoint
                                            disabled={!canPrompt}
                                            discardLaterWork={state.messages.slice(messageIndex + 1).some(laterMessage => laterMessage.role === 'user')}
                                            onReturn={() => returnToCheckpoint(message.id)}
                                        />
                                    )}
                                </Stack>
                            </Message>
                        ))}
                        </>
                    )}
                    {state.error && (
                        <Box className='rounded-md border border-destructive/40 bg-destructive/10' padding='md'>
                            <Stack gap='sm'>
                                <Text className='text-destructive'>{state.error}</Text>
                                {state.messages.some(message => message.role === 'user') && (
                                    <Button size='sm' type='button' variant='outline' onClick={onRetry}>Retry last message</Button>
                                )}
                            </Stack>
                        </Box>
                    )}
                </ConversationContent>
            </Conversation>
            {rewindAnnouncement && <span key={rewindAnnouncement.id} className='sr-only' role='status'>{rewindAnnouncement.message}</span>}
            <Stack className='border-t border-border-default bg-surface-elevated p-3' gap='sm'>
                <ProviderSetup connected={hasCredential} disabled={controlsDisabled} inputRef={providerKeyRef} provider={provider} onForget={onForgetApiKey} onSave={onSaveApiKey} />
                <ModelSelector disabled={controlsDisabled} modelId={modelId} models={models} provider={provider} onSelect={onSelectModel} />
                <PromptInput
                    context={selection}
                    disabled={!hasCredential || !canPrompt}
                    inputRef={promptRef}
                    isRunning={isRunning}
                    onRemoveContext={onRemoveSelection}
                    onStop={onStop}
                    onSubmit={onSubmit}
                />
            </Stack>
        </Stack>
    );
};
