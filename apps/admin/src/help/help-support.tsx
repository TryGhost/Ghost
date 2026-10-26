import React, { useId, useRef } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Field,
  FieldLabel,
  Input,
  LoadingIndicator,
  Textarea,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { getInitials } from './help-format';
import { HelpPanelSizeButton } from './help-panel-size';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import { getSupportContext, type HelpSignals } from './help-signals';
import type { HelpConversation } from './use-help-conversation';

/*
 * The message to the support team, which takes over the panel. Its draft
 * lives in the conversation, so going back or closing the panel keeps it, and
 * it lists the context sent along with it (getSupportContext in
 * help-signals.ts), so the user knows what support sees.
 *
 * PROTOTYPE: nothing is sent (sendToSupport in use-help-conversation.ts).
 */

interface HelpSupportViewProps {
  conversation: HelpConversation;
  signals: HelpSignals;
  showClose: boolean;
  onClose: () => void;
}

/** A message to the support team, in place of the conversation it came from. */
export function HelpSupportView({
  conversation,
  signals,
  showClose,
  onClose,
}: HelpSupportViewProps) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const { support, questionCount, editSupport, sendToSupport, leaveSupport } = conversation;
  const { user } = signals;
  const sending = support.status === 'sending';
  const sent = support.status === 'sent';
  const canSend = !!support.subject.trim() && !!support.body.trim() && !sending;

  const context = getSupportContext({
    signals,
    questionPage: conversation.lastQuestion ? conversation.lastQuestion.pageLabel : undefined,
    questionCount,
    openedArticles: conversation.openedArticles,
  });

  return (
    <div className="flex h-full min-h-0 flex-col motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-right-4">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-2">
        <Inline align="center" gap="xs">
          <Button
            aria-label="Back to help"
            disabled={sending}
            size="icon-sm"
            variant="ghost"
            onClick={leaveSupport}
          >
            <LucideIcon.ArrowLeft />
          </Button>
          <Text as="h2" size="md" weight="semibold">
            Contact support
          </Text>
        </Inline>
        <Inline className="shrink-0" gap="xs">
          <HelpPanelSizeButton />
          {showClose && (
            <Button aria-label="Close help" size="icon-sm" variant="ghost" onClick={onClose}>
              <LucideIcon.X />
            </Button>
          )}
        </Inline>
      </header>

      {sent ? (
        <Stack align="center" className="flex-1 justify-center px-8 pb-14 text-center" gap="sm">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-state-success/15 text-state-success motion-safe:animate-in motion-safe:duration-500 motion-safe:zoom-in-50">
            <LucideIcon.Check className="size-6" />
          </div>
          <Text className={REVEAL_CLASS_NAME} size="lg" style={revealAt(1)} weight="semibold">
            Sent to the support team
          </Text>
          <Text
            className={REVEAL_CLASS_NAME}
            leading="snug"
            size="sm"
            style={revealAt(2)}
            tone="secondary"
          >
            We’ll reply to {user.email}. Your reference is {support.ticket}.
          </Text>
          <Button
            className={REVEAL_CLASS_NAME}
            size="sm"
            style={revealAt(3)}
            variant="outline"
            onClick={leaveSupport}
          >
            Back to help
          </Button>
        </Stack>
      ) : (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) {
              sendToSupport();
            }
          }}
        >
          <Stack className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-6" gap="xl">
            <Text leading="snug" size="sm" tone="secondary">
              A person on the support team will reply by email. They’ll see your question, the page
              you’re on and what you’ve already read, so you won’t have to explain it twice.
            </Text>

            <Inline align="center" className="rounded-xl bg-muted px-3 py-2.5" gap="sm">
              <Avatar
                colorSeed={user.email}
                initials={getInitials(user.name)}
                src={user.profileImage}
              />
              <Stack className="min-w-0 flex-1" gap="none">
                <Text size="sm" weight="semibold" truncate>
                  {user.name}
                </Text>
                <Text size="xs" tone="secondary" truncate>
                  {user.email}
                </Text>
              </Stack>
              <Text size="xs" tone="tertiary" truncate>
                {signals.siteHost}
              </Text>
            </Inline>

            <Stack gap="lg">
              <Field>
                <FieldLabel htmlFor={`${id}-subject`}>Subject</FieldLabel>
                <Input
                  disabled={sending}
                  id={`${id}-subject`}
                  placeholder="What’s it about?"
                  value={support.subject}
                  onChange={(event) => editSupport({ subject: event.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={`${id}-message`}>Message</FieldLabel>
                <Textarea
                  disabled={sending}
                  id={`${id}-message`}
                  placeholder="What did you expect to happen, and what happened instead?"
                  rows={6}
                  value={support.body}
                  autoFocus
                  onChange={(event) => editSupport({ body: event.target.value })}
                />
              </Field>

              <Stack gap="sm">
                <Inline>
                  <Button
                    disabled={sending}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                  >
                    <LucideIcon.Paperclip />
                    Attach a file
                  </Button>
                </Inline>
                <input
                  ref={fileInput}
                  className="hidden"
                  type="file"
                  multiple
                  onChange={(event) => {
                    const names = Array.from(event.target.files ?? [], (file) => file.name);
                    editSupport({ files: [...new Set([...support.files, ...names])] });
                    event.target.value = '';
                  }}
                />
                {support.files.length > 0 && (
                  <Inline gap="xs" wrap>
                    {support.files.map((name) => (
                      <Badge key={name} className="gap-1" size="sm" variant="secondary">
                        <LucideIcon.Paperclip className="size-3" />
                        {name}
                      </Badge>
                    ))}
                  </Inline>
                )}
              </Stack>
            </Stack>

            <Stack gap="sm">
              <Text size="xs" tone="tertiary" weight="medium">
                Sent along with your message
              </Text>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 text-sm">
                {context.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <dt className="text-text-tertiary">{label}</dt>
                    <dd className="truncate text-text-primary">{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </Stack>
          </Stack>

          <div className="shrink-0 border-t border-border-default p-4">
            <Button className="w-full" disabled={!canSend} type="submit">
              {sending ? (
                <>
                  <LoadingIndicator color="light" size="sm" />
                  Sending
                </>
              ) : (
                'Send to support'
              )}
            </Button>
            <Text className="mt-2 text-center" size="xs" tone="tertiary">
              Prototype: nothing is sent yet
            </Text>
          </div>
        </form>
      )}
    </div>
  );
}
