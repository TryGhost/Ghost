import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, buttonVariants, inputSurface } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { isEmptyEmailLexical } from '@/automations/utils';
import { AutomationCardWarning } from './automation-card-warning';
import { emailTextExcerpt } from '@/automations/utils/history-email-preview';
import { AutomationCardMenu } from './automation-card-menu';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { EmailCardExcerpt, EmailCardMessage } from './email-card-content';
import {
  EMAIL_CARD_EASE,
  EmailCardClickedLinks,
  EmailCardCollapse,
  EmailCardMetrics,
  type EmailCardAnalyticsData,
} from './email-card-analytics';
import { useEmailHasNoLinks } from '@/automations/hooks/use-email-has-no-links';
import type { NodeContextMenuEntry } from './nodes';

export type EditableEmailData = {
  subject: string;
  lexical: string;
  suppressWarning: boolean;
  onInteract: () => void;
  onEditContent: () => void;
};

// EMAIL_CARD_EASE's duration plus a frame or two.
const TRANSITION_SETTLE_MS = 250;

function getEmailWarning(email: EditableEmailData, errorMessage?: string) {
  const missingSubject = !email.subject.trim();
  const missingBody = isEmptyEmailLexical(email.lexical);
  if (missingSubject && missingBody) {
    return 'Add a subject line and a message before this email can be sent.';
  }
  if (missingSubject) {
    return 'Add a subject line before this email can be sent.';
  }
  if (missingBody) {
    return 'Add a message before this email can be sent.';
  }
  return errorMessage;
}

// Holds the email view's height as the card's minimum so it never shrinks mid-switch.
const useEmailViewHeight = (showAnalytics: boolean) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const measuredOnce = useRef(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || showAnalytics) {
      return;
    }
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    const start = () => observer.observe(element);
    // Wait for a reopening email view to settle before measuring it.
    const timer = measuredOnce.current ? setTimeout(start, TRANSITION_SETTLE_MS) : undefined;
    if (!measuredOnce.current) {
      start();
      measuredOnce.current = true;
    }
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [showAnalytics]);
  return { ref, height };
};

const EmailCardAnalytics: React.FC<{ analytics: EmailCardAnalyticsData; open: boolean }> = ({
  analytics,
  open,
}) => {
  const noLinks = useEmailHasNoLinks(analytics);
  // Mount on first open, then stay mounted so closing animates.
  const [linksMounted, setLinksMounted] = useState(open);
  if (open && !linksMounted) {
    setLinksMounted(true);
  }
  return (
    <>
      <div className={cn('transition-[padding]', EMAIL_CARD_EASE, open ? 'pt-1' : 'pt-4')}>
        <EmailCardMetrics large={open} noLinks={noLinks} stats={analytics.stats} />
      </div>
      <EmailCardCollapse open={open}>
        {linksMounted && (
          <div className="pt-6">
            <EmailCardClickedLinks {...analytics} />
          </div>
        )}
      </EmailCardCollapse>
    </>
  );
};

// Cards open independently, so opening one never shifts the canvas under another.
export const EditableEmailCard: React.FC<
  React.PropsWithChildren<{
    email: EditableEmailData;
    isNew: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
    analytics?: EmailCardAnalyticsData;
  }>
> = ({ email, isNew, errorMessage, menuItems, analytics, children }) => {
  const warning =
    email.suppressWarning && !errorMessage ? undefined : getEmailWarning(email, errorMessage);
  const text = useMemo(() => emailTextExcerpt(email.lexical), [email.lexical]);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const showAnalytics = analyticsOpen && Boolean(analytics);
  const emailView = useEmailViewHeight(showAnalytics);
  return (
    <AutomationCard
      aria-label={email.subject ? `Send email: ${email.subject}` : 'Send email'}
      className={cn(
        'nodrag nopan w-[400px] text-left',
        warning && 'border-state-warning',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={email.onInteract}
      onPointerDownCapture={email.onInteract}
    >
      {children}
      <AutomationCardHeader
        actions={
          <Inline gap="xs">
            <AutomationCardWarning message={warning} />
            {analytics && (
              // Pressed matches a ghost button with its menu open, like the ⋯ beside it.
              <Button
                aria-label="Email analytics"
                aria-pressed={showAnalytics}
                className="aria-pressed:bg-button-ghost-hover aria-pressed:shadow-control-pressed"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setAnalyticsOpen((open) => !open)}
              >
                <LucideIcon.ChartNoAxesColumn />
              </Button>
            )}
            <AutomationCardMenu label="Email actions" menuItems={menuItems} />
          </Inline>
        }
        icon={<LucideIcon.Mail className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Send email"
      />
      <div className="mt-3" style={{ minHeight: emailView.height }}>
        <div ref={emailView.ref}>
          <EmailCardCollapse open={!showAnalytics}>
            <EmailCardMessage aria-label="Email message preview" className="border-0 p-0">
              {/* A read-only panel that turns into an input on hover; an empty email shows as an
                  input from the start, as there's something to fill in. */}
              <button
                aria-label="Edit email content"
                className={cn(
                  inputSurface('self'),
                  'group/field flex w-full items-start justify-between gap-2 border-transparent bg-control-readonly-surface p-5 text-left hover:border-control-border hover:bg-control-surface',
                  !email.subject.trim() &&
                    isEmptyEmailLexical(email.lexical) &&
                    'border-control-border bg-control-surface',
                )}
                type="button"
                onClick={email.onEditContent}
              >
                <span className="block min-w-0 flex-1">
                  <span
                    className={cn(
                      'mb-2 block truncate text-md font-medium',
                      email.subject.trim() ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {email.subject.trim() || 'Subject'}
                  </span>
                  <EmailCardExcerpt className="line-clamp-4 min-h-[4lh] text-[length:var(--text-control)] text-muted-foreground">
                    {text || 'Message'}
                  </EmailCardExcerpt>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                    '-my-0.5 shrink-0 translate-x-1 -translate-y-1 opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none',
                  )}
                >
                  <LucideIcon.Maximize2 strokeWidth={2} />
                </span>
              </button>
            </EmailCardMessage>
          </EmailCardCollapse>
          {analytics && <EmailCardAnalytics analytics={analytics} open={showAnalytics} />}
        </div>
      </div>
    </AutomationCard>
  );
};
