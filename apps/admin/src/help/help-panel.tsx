import type React from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
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
import { useHelpPanel } from './help-panel-context';
import { HelpPanelSizeButton } from './help-panel-size';
import { HelpResults } from './help-results';
import { HelpCompletions, HelpSearchField } from './help-search-field';
import { type HelpSignals, useHelpSignals } from './help-signals';
import { HelpSupportView } from './help-support';
import { HelpGreeting, HelpSuggestions } from './help-welcome';
import {
  HelpPanelSizeContext,
  MAXIMIZED_COLUMN_WIDTH,
  PANEL_WIDTH,
  useHelpPanelSize,
  useMaximizedWidth,
} from './use-help-panel-size';
import { type HelpSession, useHelpSearch } from './use-help-search';
import { useHelpSuggestions } from './use-help-suggestions';
import { useHelpTypeahead } from './use-help-typeahead';

/*
 * The Help panel's shell. Docked beside the page on desktop (AdminLayout
 * places it after the page, which narrows to make room) and a sheet on
 * mobile. It shows one of three views (use-help-search.ts): the search (a
 * greeting and the search field, then the FAQ questions to pick from, the
 * completions of what's being typed, or the results), an article (where a
 * search lands first), or the message to support. The search stays mounted
 * behind the other two, so Back returns to the same place.
 *
 * The session and signals live in HelpPanel, so they survive closing the
 * panel and moving between pages. README.md explains how it all fits together.
 */

interface HelpPanelContentProps {
  session: HelpSession;
  signals: HelpSignals;
  open: boolean;
  showClose: boolean;
  onClose: () => void;
}

function HelpPanelContent({ session, signals, open, showClose, onClose }: HelpPanelContentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inSearch = session.view === 'search';
  const idle = session.search === null;
  const suggestions = useHelpSuggestions(signals, true, open);
  // A picked question is an FAQ article: it opens at once, and its search
  // finds more to read under it. A completion fills the field like a typed
  // search; a question from the intro screen leaves the field empty, so Back
  // from its article is the intro again.
  const typeahead = useHelpTypeahead({
    enabled: open,
    pageKey: signals.pageKey,
    onPick: (question) => session.searchFor(question.title, question),
  });
  const pick = (article: HelpArticle) => session.searchFor(article.title, article, 'suggestion');

  // 1, 2 and 3 search for the suggestions, as their number badges say, while
  // nothing is typed. A trade-off: a question starting with one of those
  // digits ("2FA…") picks a suggestion instead.
  const pickByNumber = (event: React.KeyboardEvent) => {
    const suggestion =
      idle && typeahead.draft === '' && /^[1-9]$/.test(event.key)
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
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // Back from reading an article or writing to support, the user picks up
  // where they left off
  const wasInSearch = useRef(inSearch);
  useEffect(() => {
    if (!wasInSearch.current && inSearch) {
      inputRef.current?.focus({ preventScroll: true });
    }
    wasInSearch.current = inSearch;
  }, [inSearch]);

  const startOver = () => {
    session.reset();
    typeahead.setDraft('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(event) => {
        // Keys the field already handled (a completion, or a number) stop there
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === 'Escape' && showClose) {
          onClose();
          return;
        }
        // From anywhere else in the panel, eg. after clicking a suggestion's row
        if (inSearch && !(event.target instanceof HTMLInputElement)) {
          pickByNumber(event);
        }
      }}
    >
      {session.view === 'article' && session.reading && (
        <HelpArticleView
          // A new article starts at the top
          key={session.reading.id}
          article={session.reading}
          session={session}
          showClose={showClose}
          onClose={onClose}
          onStartOver={startOver}
        />
      )}
      {session.view === 'support' && (
        <HelpSupportView
          session={session}
          showClose={showClose}
          signals={signals}
          onClose={onClose}
          onStartOver={startOver}
        />
      )}
      {/* Hidden rather than unmounted, so it keeps its place while the user
          reads an article or writes to support */}
      <div
        className={
          inSearch
            ? 'flex h-full min-h-0 flex-col motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in'
            : 'hidden'
        }
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-4">
          <Text as="h2" size="md" weight="semibold">
            Help
          </Text>
          <Inline gap="xs">
            {!idle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Start over"
                    size="icon-sm"
                    variant="ghost"
                    onClick={startOver}
                  >
                    <LucideIcon.RotateCcw />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Start over</TooltipContent>
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

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-2 pb-6">
          {/* Outside the stack below: a sibling that comes and goes would
              re-key the field and remount it, losing what's typed */}
          {idle && (
            <div className="mb-6">
              <HelpGreeting firstName={signals.user.name.split(' ')[0] ?? ''} />
            </div>
          )}
          <Stack gap="lg">
            <HelpSearchField
              busy={session.searching}
              inputRef={inputRef}
              typeahead={typeahead}
              onKeyCommand={pickByNumber}
              onSearch={session.searchFor}
            />
            {/* Under the field, one of: the completions of what's being
                typed, the results (only while the field still holds the
                query they came from), the questions to pick from (only while
                the field is empty), or nothing: typing past the last
                completion leaves it quiet rather than snapping the questions
                back */}
            {typeahead.showMatches ? (
              <HelpCompletions typeahead={typeahead} />
            ) : session.search && typeahead.draft.trim() === session.search.query ? (
              <HelpResults
                openedArticles={session.openedArticles}
                search={session.search}
                onContactSupport={session.contactSupport}
                onRead={session.readArticle}
                onRetry={session.retry}
              />
            ) : typeahead.draft.trim() === '' ? (
              <HelpSuggestions
                failed={suggestions.isError}
                loading={suggestions.isLoading}
                pageLabel={signals.pageLabel}
                suggestions={suggestions.suggestions}
                onPick={pick}
              />
            ) : null}
          </Stack>
        </div>

        {/* Support isn't offered up front: it's where a search or article
            didn't do it (help-results.tsx, help-article-view.tsx) */}
        <footer className="flex h-11 shrink-0 items-center border-t border-border-default pr-2 pl-4">
          <a
            className="inline-flex items-center gap-1 rounded-sm text-sm text-text-secondary outline-hidden transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
            href={HELP_CENTER_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Help center
            <LucideIcon.ArrowUpRight className="size-3.5" />
          </a>
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
  const session = useHelpSearch();
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
            open={open}
            session={session}
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
            open={open}
            session={session}
            signals={signals}
            showClose
            onClose={close}
          />
        </div>
      </HelpPanelSizeContext.Provider>
    </aside>
  );
}
