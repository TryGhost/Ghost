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
    onRewind: (messageId: string) => void;
    onRemoveSelection: () => void;
    onSaveApiKey: (provider: BuilderProvider, key: string) => void;
    onForgetApiKey: (provider: BuilderProvider) => void;
    onSelectModel: (provider: BuilderProvider, modelId: string) => void;
};

export const ChatPanel = ({state, provider, modelId, models, hasCredential, selection, onSubmit, onStop, onRetry, onRewind, onRemoveSelection, onSaveApiKey, onForgetApiKey, onSelectModel}: ChatPanelProps) => {
    const isRunning = state.status === 'running';
    const controlsDisabled = isRunning || state.status === 'publishing';
    const canPrompt = state.status === 'ready' || state.status === 'interrupted';

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
                        {state.messages.map(message => (
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
                                    {message.role === 'user' && <Checkpoint disabled={!canPrompt} onReturn={() => onRewind(message.id)} />}
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
            <Stack className='border-t border-border-default bg-surface-elevated p-3' gap='sm'>
                <ProviderSetup connected={hasCredential} disabled={controlsDisabled} provider={provider} onForget={onForgetApiKey} onSave={onSaveApiKey} />
                <ModelSelector disabled={controlsDisabled} modelId={modelId} models={models} provider={provider} onSelect={onSelectModel} />
                <PromptInput
                    context={selection}
                    disabled={!hasCredential || !canPrompt}
                    isRunning={isRunning}
                    onRemoveContext={onRemoveSelection}
                    onStop={onStop}
                    onSubmit={onSubmit}
                />
            </Stack>
        </Stack>
    );
};
