import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  InputGroup,
  Button,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  buttonVariants,
  inputSurface,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
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
import ModifiedDot from '@/automations/concepts/modified-dot';
import { isConceptA, useConcept } from '@/automations/concepts/concept';

export type EditableEmailData = {
  subject: string;
  lexical: string;
  suppressWarning: boolean;
  onInteract: () => void;
  onUpdateSubject: (subject: string) => void;
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
    modified?: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
    analytics?: EmailCardAnalyticsData;
  }>
> = ({ email, isNew, errorMessage, menuItems, analytics, modified = false, children }) => {
  const warning =
    email.suppressWarning && !errorMessage ? undefined : getEmailWarning(email, errorMessage);
  const text = useMemo(() => emailTextExcerpt(email.lexical), [email.lexical]);
  // NY-1715 concepts B–D: the editor opens as an expanded view of this card, and the field
  // drops its hover fill for an outline button that appears on hover. The whole field
  // still opens the editor; the button only shows where.
  const isConcept = isConceptA(useConcept());
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const showAnalytics = analyticsOpen && Boolean(analytics);
  const emailView = useEmailViewHeight(showAnalytics);
  return (
    <AutomationCard
      aria-label={`${email.subject ? `Send email: ${email.subject}` : 'Send email'}${modified ? ', modified' : ''}`}
      className={cn(
        'nodrag nopan relative w-[400px] text-left',
        warning && 'border-state-warning',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={email.onInteract}
      onPointerDownCapture={email.onInteract}
    >
      {children}
      {modified && (
        // NY-1715 concepts: mirrors the ⋯ menu across the card edge: same 24px gap, same 36px box.
        <ModifiedDot className="absolute top-6 left-full ml-6" />
      )}
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
            <Stack gap="md">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>Subject</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Subject line"
                  value={email.subject}
                  onChange={(event) => email.onUpdateSubject(event.target.value)}
                />
              </InputGroup>
              <EmailCardMessage aria-label="Email message preview" className="border-0 p-0">
                <button
                  aria-label="Edit email content"
                  className={cn(
                    inputSurface('self'),
                    'group/field flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left',
                    isConcept ? 'hover:bg-muted/50' : 'hover:bg-muted',
                  )}
                  type="button"
                  onClick={email.onEditContent}
                >
                  <EmailCardExcerpt className="line-clamp-5 min-h-[5lh] text-[length:var(--text-control)] text-muted-foreground">
                    {text || 'Message'}
                  </EmailCardExcerpt>
                  {isConcept ? (
                    // Looks like an outline button, but is part of the field's own button:
                    // a button can't sit inside another.
                    <span
                      aria-hidden="true"
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                        '-my-0.5 shrink-0 bg-surface-elevated opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none',
                      )}
                    >
                      <LucideIcon.Maximize2 strokeWidth={2} />
                    </span>
                  ) : (
                    <LucideIcon.Pen
                      className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none"
                      strokeWidth={2}
                    />
                  )}
                </button>
              </EmailCardMessage>
            </Stack>
          </EmailCardCollapse>
          {analytics && <EmailCardAnalytics analytics={analytics} open={showAnalytics} />}
        </div>
      </div>
    </AutomationCard>
  );
};
