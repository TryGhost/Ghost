import { useRef, useState } from 'react';

import { Button } from '@tryghost/shade/components';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

import { Checkpoint } from './ai-elements/checkpoint';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from './ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from './ai-elements/message';
import { ModelPicker } from './ai-elements/model-picker';
import { PromptInput } from './ai-elements/prompt-input';
import { ToolGroup } from './ai-elements/tool';
import { ProviderSetup } from './provider-setup';

import type { BuilderSessionState } from '@/builder/core/builder-session';
import type { BuilderAttachmentSummary } from '@/builder/core/attachments';
import type { BuilderSelectionContext } from '@/builder/core/workspace';
import type { BuilderProvider, CuratedModel } from '@/builder/models/curated-models';

export type ChatPanelProps = {
  state: BuilderSessionState;
  provider: BuilderProvider;
  modelId: string;
  models: readonly CuratedModel[];
  hasCredential: boolean;
  selection?: BuilderSelectionContext | null;
  attachments?: readonly BuilderAttachmentSummary[];
  onSubmit: (value: string) => void | Promise<unknown>;
  onAddAttachments?: (files: readonly File[]) => void | Promise<unknown>;
  onRemoveAttachment?: (id: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onRewind: (messageId: string) => void | Promise<void>;
  onRemoveSelection: () => void;
  onSaveApiKey: (provider: BuilderProvider, key: string) => void;
  onForgetApiKey: (provider: BuilderProvider) => void;
  onSelectModel: (provider: BuilderProvider, modelId: string) => void;
  interactionDisabled?: boolean;
};

export const ChatPanel = ({
  state,
  provider,
  modelId,
  models,
  hasCredential,
  selection,
  attachments,
  onSubmit,
  onAddAttachments,
  onRemoveAttachment,
  onStop,
  onRetry,
  onRewind,
  onRemoveSelection,
  onSaveApiKey,
  onForgetApiKey,
  onSelectModel,
  interactionDisabled = false,
}: ChatPanelProps) => {
  const isRunning = state.status === 'running';
  const controlsDisabled = interactionDisabled || isRunning || state.status === 'publishing';
  const canPrompt =
    !interactionDisabled && (state.status === 'ready' || state.status === 'interrupted');
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const providerKeyRef = useRef<HTMLInputElement>(null);
  const rewindSequence = useRef(0);
  const [rewindAnnouncement, setRewindAnnouncement] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [draftToRestore, setDraftToRestore] = useState<{ id: number; value: string } | null>(null);

  const returnToCheckpoint = async (messageId: string, messageText: string) => {
    try {
      await onRewind(messageId);
      rewindSequence.current += 1;
      setRewindAnnouncement({ id: rewindSequence.current, message: 'Undid the selected message.' });
      setDraftToRestore({ id: rewindSequence.current, value: messageText });
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
    <Stack className="size-full min-h-0 bg-preview-canvas" gap="none">
      <Conversation>
        <ConversationContent className="min-h-full">
          {state.messages.length === 0 ? (
            <ConversationEmptyState
              description="Describe a change and Builder will inspect, edit, and verify the workspace preview."
              icon={
                <LucideIcon.Sparkles aria-hidden="true" className="size-8 text-muted-foreground" />
              }
              title="What would you like to change?"
            />
          ) : (
            <>
              {state.messages.map((message, messageIndex) => (
                <Message key={message.id} from={message.role}>
                  <Stack
                    className={message.role === 'user' ? 'relative items-end' : ''}
                    gap={message.role === 'user' ? 'none' : 'sm'}
                  >
                    <MessageContent from={message.role} status={message.status}>
                      {message.role === 'assistant' ? (
                        <Stack className="gap-4" gap="none">
                          {message.toolCalls?.length ? (
                            <ToolGroup
                              messageStatus={message.status}
                              toolCalls={message.toolCalls}
                            />
                          ) : null}
                          {(message.text || !message.toolCalls?.length) && (
                            <MessageResponse>
                              {message.text || (message.status === 'pending' ? 'Working…' : '')}
                            </MessageResponse>
                          )}
                        </Stack>
                      ) : (
                        <Text className="wrap-break-word whitespace-pre-wrap text-surface-inverse-foreground">
                          {message.text}
                        </Text>
                      )}
                    </MessageContent>
                    {message.role === 'assistant' && message.status === 'pending' && (
                      <span className="sr-only" role="status">
                        Assistant is responding
                      </span>
                    )}
                    {message.role === 'user' && (
                      <Box className="absolute right-0 -bottom-6 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100">
                        <Checkpoint
                          disabled={!canPrompt}
                          discardLaterWork={state.messages
                            .slice(messageIndex + 1)
                            .some((laterMessage) => laterMessage.role === 'user')}
                          onReturn={() => returnToCheckpoint(message.id, message.text)}
                        />
                      </Box>
                    )}
                  </Stack>
                </Message>
              ))}
            </>
          )}
          {state.error && (
            <Box className="rounded-md border border-destructive/40 bg-destructive/10" padding="md">
              <Stack gap="sm">
                <Text className="text-destructive">{state.error}</Text>
                {state.messages.some((message) => message.role === 'user') && (
                  <Button size="sm" type="button" variant="outline" onClick={onRetry}>
                    Retry last message
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </ConversationContent>
      </Conversation>
      {rewindAnnouncement && (
        <span key={rewindAnnouncement.id} className="sr-only" role="status">
          {rewindAnnouncement.message}
        </span>
      )}
      <Stack className="bg-preview-canvas p-4 pt-0" gap="sm">
        <ProviderSetup
          connected={hasCredential}
          disabled={controlsDisabled}
          inputRef={providerKeyRef}
          provider={provider}
          onForget={onForgetApiKey}
          onSave={onSaveApiKey}
        />
        <PromptInput
          attachments={attachments}
          context={selection}
          disabled={!hasCredential || !canPrompt}
          draftToRestore={draftToRestore}
          inputRef={promptRef}
          isRunning={isRunning}
          modelPicker={
            <ModelPicker
              disabled={controlsDisabled}
              modelId={modelId}
              models={models}
              provider={provider}
              onSelect={onSelectModel}
            />
          }
          onAddAttachments={onAddAttachments}
          onRemoveAttachment={onRemoveAttachment}
          onRemoveContext={onRemoveSelection}
          onStop={onStop}
          onSubmit={onSubmit}
        />
      </Stack>
    </Stack>
  );
};
