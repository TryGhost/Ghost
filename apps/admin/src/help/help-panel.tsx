import type React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, useIsMobile } from '@tryghost/shade/utils';
import { HelpArticleView } from './help-article-view';
import { type HelpArticle, HELP_CENTER_URL } from './help-center';
import { HelpComposer } from './help-composer';
import { HelpAnswerMessage, HelpQuestionMessage } from './help-messages';
import { useHelpPanel } from './help-panel-context';
import { HelpPanelSizeButton } from './help-panel-size';
import type { HelpPageKey } from './help-pages';
import { REVEAL_CLASS_NAME } from './help-reveal';
import { type HelpSignals, useHelpSignals } from './help-signals';
import { HelpSupportView } from './help-support';
import { HelpTypeahead } from './help-typeahead';
import { HelpWelcome } from './help-welcome';
import { type HelpConversation, useHelpConversation } from './use-help-conversation';
import {
  HelpPanelSizeContext,
  MAXIMIZED_COLUMN_WIDTH,
  PANEL_WIDTH,
  useHelpPanelSize,
  useMaximizedWidth,
} from './use-help-panel-size';
import { useHelpSuggestions } from './use-help-suggestions';
import { useHelpTypeahead } from './use-help-typeahead';

/*
 * The Help panel's shell. Docked beside the page on desktop (AdminLayout
 * places it after the page, which narrows to make room) and a sheet on
 * mobile. It shows one of three views (use-help-conversation.ts): the
 * conversation (welcome and suggestions, or the thread; matches as the user
 * types; the composer; the footer), an article, or the message to support.
 * The conversation stays mounted behind the other two, so Back returns to the
 * same place.
 *
 * The conversation and signals live in HelpPanel, so they survive closing the
 * panel and moving between pages. README.md explains how it all fits together.
 */

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

interface HelpPanelContentProps {
  conversation: HelpConversation;
  signals: HelpSignals;
  open: boolean;
  showClose: boolean;
  onClose: () => void;
}

function HelpPanelContent({
  conversation,
  signals,
  open,
  showClose,
  onClose,
}: HelpPanelContentProps) {
  const { messages } = conversation;
  const hasMessages = messages.length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inConversation = conversation.view === 'conversation';

  // Leaving the page out of questions (the composer's chip) lasts until the
  // user moves to another page
  const [pageLeftOutOf, setPageLeftOutOf] = useState<HelpPageKey | null>(null);
  const withPage = pageLeftOutOf !== signals.pageKey;
  const suggestions = useHelpSuggestions(signals, withPage, open);
  const typeahead = useHelpTypeahead({
    enabled: open,
    pageKey: withPage ? signals.pageKey : null,
    followUp: conversation.followUp,
    busy: conversation.working,
    onOpen: conversation.readArticle,
  });

  // A suggestion leads its own answer, with related articles beneath it, as a
  // question: unlike a match as the user types, which opens straight away, the
  // user hasn't asked anything yet
  const pick = (article: HelpArticle) => conversation.ask(article.title, withPage, article);

  // 1, 2 and 3 pick the welcome suggestions, as their number badges say, while
  // nothing is typed. A trade-off: a question starting with one of those
  // digits ("2FA…") picks a suggestion instead.
  const pickByNumber = (event: React.KeyboardEvent) => {
    const suggestion =
      !hasMessages && typeahead.draft === '' && /^[1-9]$/.test(event.key)
        ? suggestions.suggestions[Number(event.key) - 1]
        : undefined;
    if (!suggestion || event.metaKey || event.ctrlKey || event.altKey) {
      return false;
    }
    event.preventDefault();
    pick(suggestion.article);
    return true;
  };

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // Each new question (or message to support) scrolls up to the top, so its
  // answer reads from the start as it comes in beneath it. Again once the
  // answer is in: while it's working, it's too short to scroll that far.
  const lastTurnId = [...messages].reverse().find(({ type }) => type !== 'answer')?.id;
  const lastMessage = messages.at(-1);
  const lastAnswerStatus = lastMessage?.type === 'answer' ? lastMessage.status : null;
  useEffect(() => {
    const scroller = scrollRef.current;
    const turn = scroller?.querySelector<HTMLElement>(`[data-help-message="${lastTurnId}"]`);
    if (scroller && turn) {
      scroller.scrollTo({
        top: turn.offsetTop - 12,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [lastTurnId, lastAnswerStatus]);

  // Back from reading an article or writing to support, the user picks up
  // where they left off
  const wasInConversation = useRef(inConversation);
  useEffect(() => {
    if (!wasInConversation.current && inConversation) {
      textareaRef.current?.focus({ preventScroll: true });
    }
    wasInConversation.current = inConversation;
  }, [inConversation]);

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(event) => {
        // Keys the composer already handled (the matches, or a number) stop there
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === 'Escape' && showClose) {
          onClose();
          return;
        }
        // From anywhere else in the panel, eg. after clicking a suggestion's row
        if (inConversation && !(event.target instanceof HTMLTextAreaElement)) {
          pickByNumber(event);
        }
      }}
    >
      {conversation.view === 'article' && conversation.reading && (
        <HelpArticleView
          // A new article starts at the top, with its own feedback
          key={conversation.reading.id}
          article={conversation.reading}
          conversation={conversation}
          showClose={showClose}
          onClose={onClose}
        />
      )}
      {conversation.view === 'support' && (
        <HelpSupportView
          conversation={conversation}
          showClose={showClose}
          signals={signals}
          onClose={onClose}
        />
      )}
      {/* Hidden rather than unmounted, so it keeps its place while the user
          reads an article or writes to support */}
      <div
        className={
          inConversation
            ? 'flex h-full min-h-0 flex-col motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in'
            : 'hidden'
        }
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-4">
          <Text as="h2" size="md" weight="semibold">
            Help
          </Text>
          <Inline gap="xs">
            {hasMessages && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="New conversation"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      conversation.reset();
                      textareaRef.current?.focus();
                    }}
                  >
                    <LucideIcon.SquarePen />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New conversation</TooltipContent>
              </Tooltip>
            )}
            <HelpPanelSizeButton />
            {showClose && (
              <Button aria-label="Close help" size="icon-sm" variant="ghost" onClick={onClose}>
                <LucideIcon.X />
              </Button>
            )}
          </Inline>
        </header>

        <div
          ref={scrollRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6"
        >
          {hasMessages ? (
            // Announced as they arrive, for screen readers
            <Stack aria-live="polite" className="pt-2" gap="xl">
              {messages.map((message) => (
                <div key={message.id} data-help-message={message.id}>
                  {message.type === 'question' && <HelpQuestionMessage message={message} />}
                  {message.type === 'answer' && (
                    <HelpAnswerMessage
                      message={message}
                      openedArticles={conversation.openedArticles}
                      signals={signals}
                      onAskAgain={() => textareaRef.current?.focus()}
                      onContactSupport={conversation.contactSupport}
                      onRate={conversation.rate}
                      onReadArticle={conversation.readArticle}
                      onRetry={conversation.retry}
                    />
                  )}
                  {message.type === 'receipt' && (
                    // PROTOTYPE: nothing was sent, and the reference is made up
                    <Text className={REVEAL_CLASS_NAME} leading="relaxed" tone="secondary">
                      Sent to the support team, reference {message.ticket}. We’ll reply to{' '}
                      {signals.user.email}.
                    </Text>
                  )}
                </div>
              ))}
            </Stack>
          ) : (
            <HelpWelcome
              failed={suggestions.isError}
              firstName={signals.user.name.split(' ')[0] ?? ''}
              // The matches as the user types take their place for now
              loading={!typeahead.showMatches && suggestions.isLoading}
              suggestions={typeahead.showMatches ? [] : suggestions.suggestions}
              onPick={pick}
            />
          )}
        </div>

        {typeahead.showMatches && (
          <HelpTypeahead
            highlighted={typeahead.highlighted}
            listboxId={typeahead.listboxId}
            matches={typeahead.matches}
            optionId={typeahead.optionId}
            onHighlight={typeahead.setHighlighted}
            onOpen={typeahead.open}
          />
        )}
        <HelpComposer
          busy={conversation.working}
          comboboxProps={typeahead.comboboxProps}
          followUp={hasMessages}
          page={signals.pageLabel}
          textareaRef={textareaRef}
          value={typeahead.draft}
          withPage={withPage}
          onKeyCommand={(event) => pickByNumber(event) || typeahead.onKeyCommand(event)}
          onSubmit={(text) => conversation.ask(text, withPage)}
          onTogglePage={() => setPageLeftOutOf(withPage ? signals.pageKey : null)}
          onValueChange={typeahead.setDraft}
        />

        <footer className="flex h-11 shrink-0 items-center justify-between border-t border-border-default pr-2 pl-4">
          <a
            className="inline-flex items-center gap-1 rounded-sm text-sm text-text-secondary outline-hidden transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
            href={HELP_CENTER_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Help center
            <LucideIcon.ArrowUpRight className="size-3.5" />
          </a>
          <Button size="sm" variant="ghost" onClick={conversation.contactSupport}>
            <LucideIcon.MessageCircle />
            Contact support
          </Button>
        </footer>
      </div>
    </div>
  );
}

/**
 * The help panel: docked beside the page on desktop, so the page stays usable
 * while it's open, and a sheet on mobile. Rendered by AdminLayout; shows
 * nothing without a HelpPanelProvider (sites that aren't Ghost(Pro)).
 */
export function HelpPanel() {
  const helpPanel = useHelpPanel();
  const isMobile = useIsMobile();
  const signals = useHelpSignals();
  const conversation = useHelpConversation(signals);
  const asideRef = useRef<HTMLElement>(null);
  const open = helpPanel?.open ?? false;
  const size = useHelpPanelSize(open);
  const maximizedWidth = useMaximizedWidth(asideRef, size.maximized);

  // Closed, the docked panel is out of sight, so out of reach too. Through a
  // ref because React 18 has no first-class inert prop.
  useLayoutEffect(() => {
    if (asideRef.current) {
      asideRef.current.inert = !open;
    }
  }, [open, isMobile]);

  if (!helpPanel) {
    return null;
  }

  const close = () => helpPanel.setOpen(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={helpPanel.setOpen}>
        <SheetContent
          aria-describedby={undefined}
          className="flex w-full flex-col p-0 sm:max-w-none"
        >
          <SheetTitle className="sr-only">Help</SheetTitle>
          <HelpPanelContent
            conversation={conversation}
            open={open}
            showClose={false}
            signals={signals}
            onClose={close}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // The aside holds the panel's place beside the page, growing as it opens and
  // shrinking as it closes, so the page narrows in step. The panel is pinned to
  // its right edge, so it slides in as the page makes room. Maximized, the
  // aside grows over the whole page area right of Admin's sidebar, the page
  // narrowing to nothing beside it, and the content stays a readable column.
  const panelWidth = size.maximized && maximizedWidth ? maximizedWidth : PANEL_WIDTH;

  return (
    <aside
      ref={asideRef}
      aria-label="Help"
      className="relative h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none"
      style={{ width: open ? panelWidth : 0 }}
    >
      <HelpPanelSizeContext.Provider value={size}>
        <div
          className="absolute inset-y-0 right-0 flex flex-col border-l border-border-default bg-background transition-[width,padding] duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: panelWidth,
            paddingInline: size.maximized
              ? `max(0px, calc((100% - ${MAXIMIZED_COLUMN_WIDTH}px) / 2))`
              : undefined,
          }}
        >
          <HelpPanelContent
            conversation={conversation}
            open={open}
            signals={signals}
            showClose
            onClose={close}
          />
        </div>
      </HelpPanelSizeContext.Provider>
    </aside>
  );
}
