import { useEffect, useRef } from 'react';
import {
  Badge,
  Button,
  LoadingIndicator,
  Skeleton,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { type HelpArticle, HELP_CENTER_URL } from './help-center';
import { isFaqArticle } from './help-questions';
import { HelpPanelSizeButton } from './help-panel-size';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import type { HelpSignals } from './help-signals';
import type { HelpRelatedQuestions } from './use-help-related-questions';
import type { HelpSession } from './use-help-session';

/*
 * The message to the Ghost(Pro) support team: what the Support panel opens
 * on. A textarea, and under it the FAQ questions the user might be looking
 * for (use-help-related-questions.ts): the page's before they write, the ones
 * related to their words as they do. Picking one opens it over the form
 * (help-article-view.tsx) with the draft kept; the message can be sent from
 * here or from there. Once sent, a confirmation takes the form's place.
 *
 * The draft lives in the session (use-help-session.ts), so going back from
 * an article or closing the panel keeps it. Only what the user writes is
 * sent; the context a real send might add is getSupportContext in
 * help-signals.ts.
 *
 * PROTOTYPE: nothing is sent (send in use-help-session.ts).
 */

interface HelpFormViewProps {
  session: HelpSession;
  signals: HelpSignals;
  related: HelpRelatedQuestions;
  /** Shown and in use: focus goes to the message */
  active: boolean;
  showClose: boolean;
  onClose: () => void;
}

export function HelpFormView({
  session,
  signals,
  related,
  active,
  showClose,
  onClose,
}: HelpFormViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { message, canSend, editMessage, send, reset } = session;
  const sending = message.status === 'sending';
  const sent = message.status === 'sent';

  // Opening the panel, or coming back from an article, lands in the message
  useEffect(() => {
    if (active && !sent) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [active, sent]);

  return (
    <div className={active ? 'flex h-full min-h-0 flex-col' : 'hidden'}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-4">
        <Text as="h2" size="md" weight="semibold">
          Ghost(Pro) support
        </Text>
        <Inline gap="xs">
          {/* Once sent, a fresh start from here too */}
          {sent && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="Start over" size="icon-sm" variant="ghost" onClick={reset}>
                  <LucideIcon.RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start over</TooltipContent>
            </Tooltip>
          )}
          <HelpPanelSizeButton />
          {showClose && (
            <Button aria-label="Close support" size="icon-sm" variant="ghost" onClick={onClose}>
              <LucideIcon.X />
            </Button>
          )}
        </Inline>
      </header>

      {sent ? (
        <HelpSentView email={signals.user.email} onDone={reset} />
      ) : (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) {
              send();
            }
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-7 pb-10">
            <Stack gap="2xl">
              <Text
                as="h3"
                className={REVEAL_CLASS_NAME}
                leading="heading"
                size="lg"
                weight="semibold"
              >
                Tell us what you need help with
              </Text>

              {/* The message, with what might answer it right under it, where
                  the eye is while typing */}
              <Stack className={REVEAL_CLASS_NAME} gap="lg" style={revealAt(1)}>
                <Textarea
                  ref={textareaRef}
                  aria-label="Your message"
                  className="min-h-28"
                  disabled={sending}
                  placeholder="Describe what’s happening, and what you expected instead"
                  rows={4}
                  value={message.body}
                  onChange={(event) => editMessage({ body: event.target.value })}
                />
                {message.files.length > 0 && (
                  <Inline gap="xs" wrap>
                    {message.files.map((name) => (
                      <Badge key={name} className="gap-1" size="sm" variant="secondary">
                        <LucideIcon.Paperclip className="size-3" />
                        {name}
                      </Badge>
                    ))}
                  </Inline>
                )}
                <div className="-mx-2">
                  <HelpRelatedQuestionsList
                    opened={session.openedArticles}
                    related={related}
                    onPick={session.readArticle}
                  />
                </div>
              </Stack>

              <Stack className={REVEAL_CLASS_NAME} gap="md" style={revealAt(2)}>
                <Inline align="center" gap="sm" justify="between">
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
                  <input
                    ref={fileInput}
                    className="hidden"
                    type="file"
                    multiple
                    onChange={(event) => {
                      const names = Array.from(event.target.files ?? [], (file) => file.name);
                      editMessage({ files: [...new Set([...message.files, ...names])] });
                      event.target.value = '';
                    }}
                  />
                  <Button disabled={!canSend} size="sm" type="submit">
                    {sending ? (
                      <>
                        <LoadingIndicator color="light" size="sm" />
                        Sending
                      </>
                    ) : (
                      'Send to support'
                    )}
                  </Button>
                </Inline>
                <Text leading="snug" size="xs" tone="secondary">
                  A person on the Ghost(Pro) support team will reply to {signals.user.email} within
                  24 hours during working days.
                </Text>
              </Stack>
            </Stack>
          </div>
        </form>
      )}
    </div>
  );
}

/** The confirmation that takes the form's place once the message is sent. */
function HelpSentView({ email, onDone }: { email: string; onDone: () => void }) {
  return (
    <Stack align="center" className="flex-1 justify-center px-8 pb-14 text-center" gap="sm">
      <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-state-success/15 text-state-success motion-safe:animate-in motion-safe:duration-500 motion-safe:zoom-in-50">
        <LucideIcon.Check className="size-6" />
      </div>
      <Text className={REVEAL_CLASS_NAME} size="lg" style={revealAt(1)} weight="semibold">
        Sent to the Ghost(Pro) support team
      </Text>
      <Text
        className={REVEAL_CLASS_NAME}
        leading="snug"
        size="sm"
        style={revealAt(2)}
        tone="secondary"
      >
        We’ll reply to {email} within 24h during working days.
      </Text>
      <Button
        className={cn('mt-3', REVEAL_CLASS_NAME)}
        size="sm"
        style={revealAt(3)}
        onClick={onDone}
      >
        Done
      </Button>
    </Stack>
  );
}

// Rows new to the list rise in (keyed by article), each a moment after the
// one above, so a change catches the eye without the rest of the form moving
const ROW_ENTRANCE_CLASS_NAME =
  'motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-out motion-safe:fill-mode-both motion-safe:fade-in motion-safe:slide-in-from-bottom-1';
const ROW_STAGGER = 40;

// Where articles go, shown as rows of the same size while they load
const QUESTION_SLOTS = [
  { key: 'first', placeholderWidth: 'w-3/5' },
  { key: 'second', placeholderWidth: 'w-2/5' },
  { key: 'third', placeholderWidth: 'w-1/2' },
];

const ROW_CLASS_NAME = 'flex w-full items-center gap-3 rounded-lg px-2 py-2.5';

interface HelpRelatedQuestionsListProps {
  related: HelpRelatedQuestions;
  opened: HelpArticle[];
  onPick: (article: HelpArticle) => void;
}

/** The help center articles the user might be looking for, right under the message. */
function HelpRelatedQuestionsList({ related, opened, onPick }: HelpRelatedQuestionsListProps) {
  if (related.failed) {
    return (
      <Text leading="snug" size="sm" tone="secondary">
        The help center couldn’t be reached just now.{' '}
        <a
          className="underline underline-offset-2"
          href={HELP_CENTER_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open it in a new tab
        </a>
        .
      </Text>
    );
  }

  return (
    <Stack data-help-source={related.source} gap="xs">
      <Inline align="center" className="px-2" gap="sm" justify="between">
        <Inline align="center" gap="xs">
          <Text as="h3" size="sm" weight="semibold">
            You might be looking for
          </Text>
          {/* A search for the message is on its way; the last answers stay meanwhile */}
          {related.searching && <LoadingIndicator size="sm" />}
        </Inline>
        <a
          className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-text-secondary outline-hidden transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
          href={HELP_CENTER_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Help center
          <LucideIcon.ArrowUpRight className="size-3" />
        </a>
      </Inline>
      <ul
        aria-busy={related.loading}
        aria-label="Articles from the help center"
        className="flex flex-col"
      >
        {related.loading
          ? QUESTION_SLOTS.map(({ key, placeholderWidth }) => (
              <li key={key} className={ROW_CLASS_NAME} aria-hidden>
                <LucideIcon.CircleHelp className="size-4 shrink-0 text-text-tertiary" />
                {/* The zero-width space gives it a title's line height */}
                <Text as="span" className="flex flex-1 items-center" leading="snug">
                  {'\u200b'}
                  <Skeleton
                    className={cn('h-3.5', placeholderWidth)}
                    containerClassName="flex flex-1"
                  />
                </Text>
              </li>
            ))
          : related.questions.map((question, index) => (
              <li
                key={question.id}
                className={ROW_ENTRANCE_CLASS_NAME}
                style={{ animationDelay: `${index * ROW_STAGGER}ms` }}
              >
                <button
                  className={cn(
                    ROW_CLASS_NAME,
                    'group text-left outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring',
                  )}
                  type="button"
                  onClick={() => onPick(question)}
                >
                  {isFaqArticle(question) ? (
                    <LucideIcon.CircleHelp className="size-4 shrink-0 text-text-secondary" />
                  ) : (
                    <LucideIcon.FileText className="size-4 shrink-0 text-text-secondary" />
                  )}
                  <Text as="span" className="min-w-0 flex-1" leading="snug" weight="medium">
                    {question.title}
                  </Text>
                  {opened.some(({ id }) => id === question.id) && (
                    <Text as="span" className="shrink-0" size="xs" tone="tertiary">
                      Read
                    </Text>
                  )}
                  <LucideIcon.ChevronRight className="size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
                </button>
              </li>
            ))}
      </ul>
    </Stack>
  );
}
