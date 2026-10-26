import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  InputGroup,
  Button,
  FieldError,
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
import ModifiedDot, { TkMarker } from '@/automations/concepts/modified-dot';
import { emailHasTk, requestTkFocus } from '@/automations/concepts/tk';
import { inertWhen, restoreMenuItems } from '@/automations/concepts/deleted-step';
import type { StepChangeKind } from '@/automations/concepts/pending-changes';
import { isCanvasCardV2, isConceptA, isConceptF, useConcept } from '@/automations/concepts/concept';

export type EditableEmailData = {
  subject: string;
  lexical: string;
  suppressWarning: boolean;
  onInteract: () => void;
  onUpdateSubject: (subject: string) => void;
  onEditContent: () => void;
  // NY-1715 concept E: puts this email back to the last save, from its Unsaved changes marker.
  onRevert?: () => void;
  // NY-1715 concept F: deleted since the last save, which will remove it.
  deleted?: boolean;
  // NY-1715 concept E: what the next save does to this email, named beside it.
  changeKind?: StepChangeKind;
  revertLabel?: string;
  // NY-1715 concept E: what the yellow dot means, on hovering it.
  unsavedHint?: string;
};

// EMAIL_CARD_EASE's duration plus a frame or two.
const TRANSITION_SETTLE_MS = 250;

// NY-1715 concept E (short): the message sits right under the preview, so it can be brief.
function getEmailWarning(email: EditableEmailData, errorMessage?: string, short = false) {
  const missingSubject = !email.subject.trim();
  const missingBody = isEmptyEmailLexical(email.lexical);
  if (missingSubject && missingBody) {
    return short
      ? 'Add a subject and message'
      : 'Add a subject line and a message before this email can be sent.';
  }
  if (missingSubject) {
    return short ? 'Add a subject' : 'Add a subject line before this email can be sent.';
  }
  if (missingBody) {
    return short ? 'Add a message' : 'Add a message before this email can be sent.';
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
  const text = useMemo(() => emailTextExcerpt(email.lexical), [email.lexical]);
  // NY-1715 concepts B–D: the editor opens as an expanded view of this card, and the field
  // drops its hover fill for an outline button that appears on hover. The whole field
  // still opens the editor; the button only shows where.
  const concept = useConcept();
  const isConcept = isConceptA(concept);
  // E (Canvas card v2): the subject moves inside the message preview, and a click opens the
  // editor with the subject focused, so it's still one click to edit.
  const combinesSubject = isCanvasCardV2(concept);
  const deleted = email.deleted ?? false;
  // A step waiting to be deleted: F fades the whole card; E shrinks it to its header, titled
  // "Email deleted".
  const fadesDeleted = deleted && isConceptF(concept);
  const showsDotInTitle = isCanvasCardV2(concept) && !isConceptF(concept);
  const shrinksDeleted = deleted && !isConceptF(concept);
  // A deleted email is going, so nothing about it needs fixing.
  const emailWarning =
    deleted || (email.suppressWarning && !errorMessage)
      ? undefined
      : getEmailWarning(email, errorMessage, combinesSubject);
  // E: a problem is a plain Shade field error on the preview (red border, message below),
  // without the card's amber border and warning icon on top.
  const warning = combinesSubject ? undefined : emailWarning;
  const previewError = combinesSubject ? emailWarning : undefined;
  const previewErrorId = useId();
  const hasTk = useMemo(
    () => combinesSubject && emailHasTk(email.subject, email.lexical),
    [combinesSubject, email.subject, email.lexical],
  );
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const showAnalytics = analyticsOpen && Boolean(analytics);
  const emailView = useEmailViewHeight(showAnalytics);
  return (
    <AutomationCard
      aria-label={`${email.subject ? `Send email: ${email.subject}` : 'Send email'}${deleted ? ', deleted' : modified ? ', modified' : ''}`}
      className={cn(
        'group/card nodrag nopan relative w-[400px] text-left',
        warning && 'border-state-warning',
        // F: a step waiting to be deleted is the whole card at half strength (Shade's disabled
        // opacity), drawn with see-through colours rather than opacity, so the marker beside it
        // stays solid. Its shadow would only muddy the faded surface. E shrinks it instead.
        fadesDeleted && 'border-border-default/50 bg-surface-elevated/50 shadow-none',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      // Spacing above the body lives inside its collapse (below), so a shrunk card closes up.
      gap="none"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={email.onInteract}
      onPointerDownCapture={email.onInteract}
    >
      {children}
      {modified &&
        !showsDotInTitle && (
          // NY-1715 concepts: mirrors the ⋯ menu across the card edge: same 24px gap, same 36px box.
          <ModifiedDot
            changeKind={email.changeKind}
            className="absolute top-6 left-full ml-6"
            revertLabel={email.revertLabel}
            onRevert={email.onRevert}
          />
        )}
      <div ref={inertWhen(fadesDeleted)} className={cn(fadesDeleted && 'opacity-50')}>
        <AutomationCardHeader
          actions={
            shrinksDeleted ? (
              <Inline gap="xs">
                {email.onRevert && (
                  <AutomationCardMenu
                    label="Email actions"
                    menuItems={restoreMenuItems(email.onRevert)}
                  />
                )}
              </Inline>
            ) : (
              <Inline gap="xs">
                {hasTk &&
                  !deleted && (
                    // E: first in the header's actions; opens the email at its first TK.
                    <TkMarker
                      onClick={() => {
                        requestTkFocus();
                        email.onEditContent();
                      }}
                    />
                  )}
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
            )
          }
          icon={<LucideIcon.Mail className="size-4" />}
          iconClassName={cn('p-2.5', shrinksDeleted ? 'text-muted-foreground' : 'text-foreground')}
          title={shrinksDeleted ? 'Email deleted' : 'Send email'}
          titleAddon={
            // E: the yellow dot follows the title; hovering it says what it means.
            modified &&
            showsDotInTitle && (
              <ModifiedDot
                className="ml-1 inline-flex h-auto align-middle"
                hint={email.unsavedHint}
              />
            )
          }
          titleClassName={
            // E: a deleted step's icon and title go muted, as it's on its way out.
            cn(shrinksDeleted && 'text-muted-foreground')
          }
        />
      </div>
      {/* E: a deleted email's body folds away, leaving the header. */}
      <EmailCardCollapse open={!shrinksDeleted}>
        <div
          ref={inertWhen(deleted)}
          className={cn('pt-6', fadesDeleted && 'opacity-50')}
          style={{ minHeight: emailView.height }}
        >
          <div ref={emailView.ref}>
            <EmailCardCollapse open={!showAnalytics}>
              <Stack gap="md">
                {!combinesSubject && (
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
                )}
                <EmailCardMessage aria-label="Email message preview" className="border-0 p-0">
                  <button
                    aria-describedby={previewError ? previewErrorId : undefined}
                    aria-label="Edit email content"
                    className={cn(
                      inputSurface('self'),
                      'group/field flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left',
                      isConcept ? 'hover:bg-muted/50' : 'hover:bg-muted',
                      // E: roomier now it holds the subject as well as the message, and a soft grey
                      // panel (Shade's read-only control surface, gray-50) at rest; on hover it turns
                      // into a Shade input (control border, white control surface) as the maximize
                      // button appears.
                      combinesSubject &&
                        'border-transparent bg-control-readonly-surface p-5 hover:border-control-border hover:bg-control-surface',
                      // An empty email is a plain Shade input at rest, so it reads as something to fill in.
                      combinesSubject &&
                        !email.subject.trim() &&
                        isEmptyEmailLexical(email.lexical) &&
                        'border-control-border bg-control-surface',
                      // In error it's a Shade input at rest too (white surface), like the other fields.
                      previewError &&
                        'border-destructive bg-control-surface hover:border-destructive',
                    )}
                    type="button"
                    onClick={email.onEditContent}
                  >
                    {combinesSubject ? (
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
                    ) : (
                      <EmailCardExcerpt className="line-clamp-5 min-h-[5lh] text-[length:var(--text-control)] text-muted-foreground">
                        {text || 'Message'}
                      </EmailCardExcerpt>
                    )}
                    {isConcept ? (
                      // Looks like an outline button, but is part of the field's own button:
                      // a button can't sit inside another.
                      <span
                        aria-hidden="true"
                        className={cn(
                          // E: Shade's plain borderless (ghost) button; B–D keep the solid outline one.
                          buttonVariants({
                            variant: combinesSubject ? 'ghost' : 'outline',
                            size: 'icon-sm',
                          }),
                          '-my-0.5 shrink-0 opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100 motion-reduce:transition-none',
                          !combinesSubject && 'bg-surface-elevated',
                          // E: nudged 4px up and right, towards the corner.
                          combinesSubject && 'translate-x-1 -translate-y-1',
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
                  {previewError && (
                    <FieldError className="mt-2" id={previewErrorId}>
                      {previewError}
                    </FieldError>
                  )}
                </EmailCardMessage>
              </Stack>
            </EmailCardCollapse>
            {analytics && <EmailCardAnalytics analytics={analytics} open={showAnalytics} />}
          </div>
        </div>
      </EmailCardCollapse>
    </AutomationCard>
  );
};
