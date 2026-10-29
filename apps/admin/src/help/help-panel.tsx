import { useLayoutEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@tryghost/shade/components';
import { useIsMobile } from '@tryghost/shade/utils';
import { HelpArticleView } from './help-article-view';
import { HelpFormView } from './help-form';
import { useHelpPanel } from './help-panel-context';
import { type HelpSignals, useHelpSignals } from './help-signals';
import {
  HelpPanelSizeContext,
  MAXIMIZED_COLUMN_WIDTH,
  PANEL_WIDTH,
  useHelpPanelSize,
  useMaximizedWidth,
} from './use-help-panel-size';
import { useHelpRelatedQuestions } from './use-help-related-questions';
import { type HelpSession, useHelpSession } from './use-help-session';

/*
 * The Support panel's shell. Docked beside the page on desktop (AdminLayout
 * places it after the page, which narrows to make room) and a sheet on
 * mobile. It shows one of two views (use-help-session.ts): the message to
 * support, with the FAQ questions the user might be looking for under it
 * (help-form.tsx), or one of those articles, read over the message
 * (help-article-view.tsx). The form stays mounted behind the article, so
 * Back returns to the message as it was left.
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
  const inForm = session.view === 'form';
  const related = useHelpRelatedQuestions(signals, session.message.body, open);

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(event) => {
        if (!event.defaultPrevented && event.key === 'Escape' && showClose) {
          onClose();
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
        />
      )}
      <HelpFormView
        active={open && inForm}
        related={related}
        session={session}
        showClose={showClose}
        signals={signals}
        onClose={onClose}
      />
    </div>
  );
}

/**
 * The Support panel: docked beside the page on desktop, so the page stays
 * usable while it's open, and a sheet on mobile. Rendered by AdminLayout;
 * shows nothing without a HelpPanelProvider (sites that aren't Ghost(Pro)).
 */
export function HelpPanel() {
  const helpPanel = useHelpPanel();
  const isMobile = useIsMobile();
  const signals = useHelpSignals();
  const session = useHelpSession();
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
          <SheetTitle className="sr-only">Support</SheetTitle>
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
      aria-label="Support"
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
