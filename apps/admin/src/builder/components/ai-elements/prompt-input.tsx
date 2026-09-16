import { useEffect, useRef, useState } from 'react';

import { Button, Textarea } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

import type { FormEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import type { BuilderAttachmentSummary } from '@/builder/core/attachments';

export const maxBuilderPromptLength = 32_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const PromptInput = ({
  disabled,
  isRunning,
  context,
  inputRef,
  modelPicker,
  attachments = [],
  draftToRestore,
  onAddAttachments,
  onRemoveAttachment,
  onRemoveContext,
  onSubmit,
  onStop,
}: {
  disabled?: boolean;
  isRunning: boolean;
  context?: { label: string } | null;
  inputRef?: Ref<HTMLTextAreaElement>;
  modelPicker?: ReactNode;
  attachments?: readonly BuilderAttachmentSummary[];
  draftToRestore?: { id: number; value: string } | null;
  onAddAttachments?: (files: readonly File[]) => void | Promise<unknown>;
  onRemoveAttachment?: (id: string) => void;
  onRemoveContext?: () => void;
  onSubmit: (value: string) => void | Promise<unknown>;
  onStop: () => void;
}) => {
  const [value, setValue] = useState('');
  const [submissionError, setSubmissionError] = useState<string>();
  const [attachmentError, setAttachmentError] = useState<string>();
  const [addingAttachments, setAddingAttachments] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draftToRestore) {
      setValue((current) => (current.trim() ? current : draftToRestore.value));
    }
  }, [draftToRestore]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = value.trim();
    if (!text || disabled || isRunning || addingAttachments) {
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
      setValue((current) => current || text);
      setSubmissionError(errorMessage(error));
    });
  };

  const addAttachments = async (files: FileList | null) => {
    if (!files?.length || !onAddAttachments || addingAttachments) {
      return;
    }
    setAddingAttachments(true);
    setAttachmentError(undefined);
    try {
      await onAddAttachments(Array.from(files));
    } catch (error) {
      setAttachmentError(errorMessage(error));
    } finally {
      setAddingAttachments(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
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
    <form
      className="builder-raised-surface rounded-2xl bg-surface-elevated p-2 focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/25"
      onSubmit={submit}
    >
      <Stack gap="sm">
        {context && (
          <Inline>
            <Button
              aria-label={`Remove ${context.label} context`}
              size="sm"
              type="button"
              variant="outline"
              onClick={onRemoveContext}
            >
              <LucideIcon.MousePointer2 aria-hidden="true" />
              {context.label}
              <LucideIcon.X aria-hidden="true" />
            </Button>
          </Inline>
        )}
        {attachments.length > 0 && (
          <Inline className="flex-wrap" gap="xs">
            {attachments.map((attachment) => (
              <Button
                key={attachment.id}
                aria-label={`Remove ${attachment.name}`}
                disabled={disabled || isRunning || addingAttachments}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onRemoveAttachment?.(attachment.id)}
              >
                {attachment.kind === 'image' ? (
                  <LucideIcon.Image aria-hidden="true" />
                ) : (
                  <LucideIcon.FileText aria-hidden="true" />
                )}
                <span className="max-w-40 truncate">{attachment.name}</span>
                <LucideIcon.X aria-hidden="true" />
              </Button>
            ))}
          </Inline>
        )}
        <Textarea
          ref={inputRef}
          aria-invalid={Boolean(submissionError)}
          aria-label="Describe a change"
          className="min-h-14 resize-none border-transparent bg-transparent px-2 py-1 shadow-none focus-visible:border-transparent focus-visible:ring-0 disabled:border-transparent disabled:bg-transparent"
          disabled={disabled}
          maxLength={maxBuilderPromptLength}
          placeholder="Describe what you want to change…"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSubmissionError(undefined);
          }}
          onKeyDown={handleKeyDown}
        />
        {(submissionError || attachmentError) && (
          <Text className="text-destructive" role="alert" size="sm">
            {submissionError || attachmentError}
          </Text>
        )}
        <Inline align="center" justify="between">
          <Inline align="center" gap="xs">
            {onAddAttachments && (
              <>
                <input
                  ref={attachmentInputRef}
                  accept=".csv,.json,.txt,.md,.gif,.jpg,.jpeg,.png,.svg,.webp,application/json,text/csv,text/plain,text/markdown,image/gif,image/jpeg,image/png,image/svg+xml,image/webp"
                  aria-label="Add attachments"
                  className="sr-only"
                  disabled={disabled || isRunning || addingAttachments}
                  multiple={true}
                  type="file"
                  onChange={(event) => void addAttachments(event.target.files)}
                />
                <Button
                  aria-label="Attach files"
                  disabled={disabled || isRunning || addingAttachments}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  {addingAttachments ? (
                    <LucideIcon.LoaderCircle
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                    />
                  ) : (
                    <LucideIcon.Plus aria-hidden="true" />
                  )}
                </Button>
              </>
            )}
            {modelPicker}
          </Inline>
          {isRunning ? (
            <Button
              aria-label="Stop generating"
              size="icon"
              type="button"
              variant="outline"
              onClick={onStop}
            >
              <LucideIcon.Square aria-hidden="true" />
            </Button>
          ) : (
            <Button
              aria-label="Send message"
              className="builder-raised-dark builder-raised-surface rounded-full"
              disabled={disabled || addingAttachments || !value.trim()}
              size="icon"
              type="submit"
            >
              <LucideIcon.ArrowUp aria-hidden="true" />
            </Button>
          )}
        </Inline>
      </Stack>
    </form>
  );
};
