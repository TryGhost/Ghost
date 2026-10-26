import EmailEditor from './email-editor';
import EmailPreviewFrame from './preview-frame';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import TestEmailDropdown from './test-email-dropdown';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Popover,
  PopoverTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { getEmailValidationErrors } from './validation';
import { useBrowseAutomatedEmails } from '@tryghost/admin-x-framework/api/automated-emails';
import { useEmailPreview } from './use-email-preview';
import { useEmailSenderDetails } from './use-sender-details';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { usePreviewAutomationEmail } from '@tryghost/admin-x-framework/api/automations';
import {
  isCanvasCard,
  isCanvasCardV2,
  isConceptA,
  isConceptF,
  useConcept,
} from '@/automations/concepts/concept';
import { useExpandFromCard } from '@/automations/concepts/use-expand-from-card';
import ChangesIndicator from '@/automations/concepts/changes-indicator';
import { EditedLabel } from '@/automations/concepts/modified-dot';
import TkIndicators from '@/automations/concepts/tk-indicators';
import {
  clearTkFocusRequest,
  findSubjectTk,
  hasTkFocusRequest,
  selectFirstBodyTk,
} from '@/automations/concepts/tk';
import type { PendingChangesKind, StepChangeKind } from '@/automations/concepts/pending-changes';
import type { EmailModalMode } from '@/automations/components/types';

interface EmailPreviewModalContentProps {
  title: React.ReactNode;
  titleClassName?: string;
  headerClassName?: string;
  centeredHeaderContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  // A full-width row under the title row, still inside the fixed header.
  headerBelow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  // The scrolling body under the fixed header.
  bodyClassName?: string;
  isEditMode?: boolean;
}

const EmailPreviewModalContent = React.forwardRef<HTMLDivElement, EmailPreviewModalContentProps>(
  (
    {
      title,
      titleClassName,
      headerClassName,
      centeredHeaderContent,
      headerActions,
      headerBelow,
      children,
      className,
      bodyClassName,
      isEditMode = false,
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex size-full flex-col gap-0 overflow-hidden p-0',
        isEditMode ? 'bg-white' : 'bg-gray-100',
        'dark:bg-[#151719]',
        className,
      )}
    >
      <div
        className={cn(
          'sticky top-0 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-900 dark:bg-gray-950',
          headerClassName,
        )}
      >
        <h3 className={cn('justify-self-start text-xl font-semibold', titleClassName)}>{title}</h3>
        <div className="justify-self-center">{centeredHeaderContent}</div>
        <div className="flex items-center gap-2 justify-self-end">{headerActions}</div>
        {headerBelow && <div className="col-span-3 mt-6">{headerBelow}</div>}
      </div>
      <div
        className={cn(
          'flex min-h-0 grow [scrollbar-gutter:stable] flex-col overflow-y-auto',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  ),
);
EmailPreviewModalContent.displayName = 'EmailPreviewModalContent';

interface EmailPreviewEmailHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const EmailPreviewEmailHeader: React.FC<EmailPreviewEmailHeaderProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'relative isolate z-20 mx-auto w-full max-w-[780px] rounded-t-lg border border-b-0 border-gray-200 bg-white px-6 py-4 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none dark:border-gray-900 dark:bg-[#2E3338]',
      className,
    )}
  >
    {children}
  </div>
);

interface EmailPreviewBodyProps {
  children: React.ReactNode;
  className?: string;
}

const EmailPreviewBody: React.FC<EmailPreviewBodyProps> = ({ children, className }) => (
  <div
    className={cn(
      'mx-auto flex w-full max-w-[780px] grow rounded-b-lg transition-[max-width,height,padding] duration-300 ease-out motion-reduce:transition-none dark:border-gray-900 dark:shadow-none',
      className,
    )}
  >
    {children}
  </div>
);

export interface EmailContentModalProps {
  automationId: string;
  initialLexical: string;
  initialMode?: EmailModalMode;
  initialSubject: string;
  isDiscardNavigationBlocked?: boolean;
  onClose: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onDiscardBlockedNavigation?: () => void;
  onKeepEditingAfterBlockedNavigation?: () => void;
  onSave: (data: { subject: string; lexical: string }) => void;
  // NY-1715 concept A2: the email step whose card the editor grows out of.
  originStepId?: string;
  // NY-1715 concept B: the automation's unsaved/unpublished state, shown beside Test.
  pendingChanges?: PendingChangesKind | null;
  // NY-1715 concept E: this email differs from the last save, for the Unsaved marker.
  isEmailModified?: boolean;
  // NY-1715 concept C: shown below the panel, on the scrim — never inside the editor.
  footer?: React.ReactNode;
  // NY-1715 concept D: called as the editor starts closing, so the canvas can bring its
  // sidebar back in step with the shrink.
  onCloseStart?: () => void;
  // NY-1715 concepts D and E: changes when Discard (or its Undo) swaps the automation under the
  // open editor, which then starts over from the email's new content.
  resetKey?: number;
  // NY-1715 concept E: puts this email back to the last save, from the Unsaved changes marker.
  onRevert?: () => void;
  // NY-1715 concept E: what the next save does to this email, named on the marker.
  emailChangeKind?: StepChangeKind;
  // NY-1715 concept E: what the yellow dot means, on hovering it.
  unsavedHint?: string;
  revertLabel?: string;
}

// NY-1715 concept A: a tooltip for each icon action in the editor's top-right corner.
const HeaderTooltip: React.FC<{ label: string; children: React.ReactElement }> = ({
  label,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

// Koenig popups (link input, emoji picker, card settings) handle Escape
// themselves — the dialog shouldn't also act on it.
const isKoenigPortalFocused = () => {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement.closest('[data-kg-portal]') !== null;
};

const EmailContentModal: React.FC<EmailContentModalProps> = ({
  automationId,
  initialMode = 'edit',
  initialSubject,
  initialLexical,
  isDiscardNavigationBlocked = false,
  onClose,
  onDirtyChange,
  onDiscardBlockedNavigation,
  onKeepEditingAfterBlockedNavigation,
  onSave,
  originStepId,
  pendingChanges = null,
  isEmailModified = false,
  footer,
  onCloseStart,
  resetKey = 0,
  onRevert,
  revertLabel,
  emailChangeKind,
  unsavedHint,
}) => {
  // Concept A applies edits straight to the automation, like edits made on the
  // canvas, so the modal has no save step of its own. Read once so switching
  // concepts mid-edit can't leave the modal half in each mode.
  const conceptAtOpen = useConcept();
  const [appliesEditsLive] = useState(isConceptA(conceptAtOpen));
  // A2 and A3: the panel grows out of the email card. A2 settles as a narrower panel under
  // the automation header.
  const [expandsInPlace] = useState(conceptAtOpen === 'a2' || isCanvasCard(conceptAtOpen));
  // A3: same panel as A2, centred on a cleared canvas instead of over a scrim.
  const [clearsCanvas] = useState(isCanvasCard(conceptAtOpen));
  // E (Canvas card v2): the feedback round — subject at the top of the body, a slim header,
  // and an "Unsaved" marker on edited cards. Clicking the canvas minimizes it, as in C.
  const [isCanvasCardV2Editor] = useState(isCanvasCardV2(conceptAtOpen));
  // E (not F): 32px padding all round instead of 96px at the sides, with Koenig's + button and
  // the TK reminders sitting out past the panel's edges, 24px clear of them, rather than
  // being cropped.
  const [overhangsPlus] = useState(isCanvasCardV2(conceptAtOpen) && !isConceptF(conceptAtOpen));
  // E: opened from a card's TK marker, so the first TK is selected, as Koenig's own TK
  // indicator does — in the subject if it has one, otherwise in the body.
  const [opensAtTk] = useState(() => isCanvasCardV2(conceptAtOpen) && hasTkFocusRequest());
  const [subjectTk] = useState(() => (opensAtTk ? findSubjectTk(initialSubject || '') : null));
  useEffect(() => clearTkFocusRequest(), []);
  // E: the writing column, which the stand-in TK indicators are drawn over.
  const [editorColumn, setEditorColumn] = useState<HTMLDivElement | null>(null);
  // B shows the unsaved/unpublished indicator beside close; Test stays in the Preview tab
  // for every concept. B closes with a text Close.
  const isFullModal = appliesEditsLive && !expandsInPlace;
  const hasHeaderIndicator = isFullModal;
  // C keeps the automation header live while the editor is open, so Save / Publish stay a
  // click away: the editor's layer starts below the header (measured once, as it opens) and
  // leaves the header out of the inert treatment below. The panel then clears the header by
  // the same gap it leaves at the sides.
  const [headerBottom] = useState(() => {
    const header = document.querySelector('[data-testid="automation-editor"] > header');
    return header ? header.getBoundingClientRect().bottom : 0;
  });
  const [panelGap] = useState(() => (window.matchMedia('(min-width: 640px)').matches ? 24 : 16));
  const expandFromCard = useExpandFromCard({
    enabled: expandsInPlace,
    stepId: originStepId,
    clearsCanvas,
  });
  const { close: closeIntoCard } = expandFromCard;
  const closeEditor = useCallback(() => {
    onCloseStart?.();
    closeIntoCard(onClose);
  }, [closeIntoCard, onClose, onCloseStart]);
  // Live edits flow back in through initialLexical, so keep the content as it was on open.
  const [lexicalAtOpen, setLexicalAtOpen] = useState(initialLexical || '');
  const { mutateAsync: previewAutomationEmail } = usePreviewAutomationEmail();
  const { data: automatedEmailsData } = useBrowseAutomatedEmails();
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [mode, setMode] = useState<EmailModalMode>(automationId ? initialMode : 'edit');
  const [previewSubjectOverride, setPreviewSubjectOverride] = useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const hasEnteredInitialPreview = useRef(false);
  const normalizedLexical = useRef<string>(initialLexical || '');
  const hasEditorBeenFocused = useRef(false);
  const allowDirtyCloseRef = useRef(false);
  const handleError = useHandleError();
  const automatedEmails = automatedEmailsData?.automated_emails || [];
  const { resolvedSenderName, resolvedSenderEmail, resolvedReplyToEmail, hasDistinctReplyTo } =
    useEmailSenderDetails(automatedEmails);

  // Saving commits whatever the user has — including an empty subject or body — to the
  // automation draft. Completeness is only enforced when publishing the automation or
  // sending a test email (see validateForTest below), not when saving a draft.
  const {
    formState,
    saveState,
    updateForm,
    setFormState,
    setErrors,
    handleSave,
    okProps,
    errors,
    clearError,
  } = useForm({
    initialState: {
      subject: initialSubject || '',
      lexical: initialLexical || '',
    },
    savingDelay: 500,
    onSave: (state) => {
      onSave({ subject: state.subject, lexical: state.lexical });
    },
    onSaveError: handleError,
  });

  // Koenig only reads its value on mount, so it remounts (editorKey) in the same render that
  // picks up the new content. Only a new reset key restarts it; live edits change the initial
  // values too.
  const [editorKey, setEditorKey] = useState(resetKey);
  useEffect(() => {
    if (resetKey === editorKey) {
      return;
    }
    // The remounted editor normalizes the new content before it can take focus, as on open.
    hasEditorBeenFocused.current = false;
    normalizedLexical.current = initialLexical || '';
    setLexicalAtOpen(initialLexical || '');
    setFormState(() => ({ subject: initialSubject || '', lexical: initialLexical || '' }));
    setEditorKey(resetKey);
  }, [resetKey]);

  const validateForTest = useCallback((): boolean => {
    const newErrors = getEmailValidationErrors(formState);
    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  }, [formState, setErrors]);
  const saveButtonLabel = okProps.label || 'Save';
  const { previewFrameState, enterPreview, exitPreview } = useEmailPreview({
    automationId,
    previewAutomationEmail,
    setErrors,
  });

  useEffect(() => {
    if (!automationId || initialMode !== 'preview' || hasEnteredInitialPreview.current) {
      return;
    }
    hasEnteredInitialPreview.current = true;
    void enterPreview(formState);
  }, [automationId, enterPreview, formState, initialMode]);

  // With live edits, unsaved work belongs to the automation and its own guard covers it.
  const isDirty = !appliesEditsLive && saveState === 'unsaved';

  const formStateRef = useRef(formState);
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  const applyLive = useCallback(
    (next: { subject: string; lexical: string }) => {
      if (appliesEditsLive) {
        onSave(next);
      }
    },
    [appliesEditsLive, onSave],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty && !allowDirtyCloseRef.current);
    return () => {
      onDirtyChange?.(false);
    };
  }, [isDirty, onDirtyChange]);

  // Single close funnel: Esc, overlay click, and the Close button all route here.
  const attemptClose = useCallback(() => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
    } else {
      closeEditor();
    }
  }, [closeEditor, isDirty]);

  // Commit to the automation draft. The Close button is the only way out of the modal.
  // Concept A has nothing to commit, so Done (and Cmd+S) just closes.
  const handleSaveClick = useCallback(async () => {
    if (appliesEditsLive) {
      closeEditor();
      return;
    }
    await handleSave({ fakeWhenUnchanged: true });
  }, [appliesEditsLive, closeEditor, handleSave]);

  const handleSaveClickRef = useRef(handleSaveClick);
  useEffect(() => {
    handleSaveClickRef.current = handleSaveClick;
  }, [handleSaveClick]);

  useEffect(() => {
    const handleCMDS = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSaveClickRef.current();
      }
    };
    window.addEventListener('keydown', handleCMDS);
    return () => {
      window.removeEventListener('keydown', handleCMDS);
    };
  }, []);

  const [dialogContentNode, setDialogContentNode] = useState<HTMLDivElement | null>(null);

  // The dialog is non-modal so Radix's focus trap can't fight Koenig's
  // body-level portals (link input, toolbar, emoji picker), which means
  // nothing stops focus from reaching the admin UI behind the editor. Make
  // everything else at body level inert while the editor is open —
  // unfocusable, unclickable, and hidden from screen readers. Koenig
  // portals and stacked dialogs mount after this runs, so they stay
  // interactive.
  useEffect(() => {
    const dialogPortalWrapper = dialogContentNode?.closest('body > *');
    if (!dialogPortalWrapper) {
      return;
    }

    const madeInert: HTMLElement[] = [];
    // C: everything but the automation header, which stays usable (see headerBottom above).
    const editorRoot = clearsCanvas
      ? document.querySelector<HTMLElement>('[data-testid="automation-editor"]')
      : null;
    for (const el of document.body.children) {
      if (
        el !== dialogPortalWrapper &&
        el instanceof HTMLElement &&
        !el.inert &&
        !(editorRoot && el.contains(editorRoot))
      ) {
        el.inert = true;
        madeInert.push(el);
      }
    }
    if (editorRoot) {
      for (const el of editorRoot.children) {
        if (el instanceof HTMLElement && el.tagName !== 'HEADER' && !el.inert) {
          el.inert = true;
          madeInert.push(el);
        }
      }
    }

    return () => {
      madeInert.forEach((el) => {
        el.inert = false;
      });
    };
  }, [clearsCanvas, dialogContentNode]);

  // E: a TK in the body is selected once Koenig has loaded. It waits a tick past the editor
  // appearing, so the editor's load normalisation is never taken for an edit.
  useEffect(() => {
    if (!opensAtTk || subjectTk || !dialogContentNode) {
      return;
    }
    let isEditorSeen = false;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const editable = dialogContentNode.querySelector<HTMLElement>(
        '[data-testid="email-editor"] [contenteditable="true"]',
      );
      if (
        (editable && isEditorSeen && selectFirstBodyTk(editable)) ||
        performance.now() - startedAt > 3000
      ) {
        window.clearInterval(timer);
      }
      isEditorSeen = Boolean(editable);
    }, 150);
    return () => window.clearInterval(timer);
  }, [dialogContentNode, opensAtTk, subjectTk]);

  const handleModeChange = useCallback(
    (nextMode: EmailModalMode) => {
      if (nextMode === 'preview' && !automationId) {
        return;
      }
      setMode(nextMode);

      if (nextMode === 'preview') {
        setPreviewSubjectOverride(null);
        void enterPreview(formState);
      } else {
        setShowTestDropdown(false);
        setPreviewSubjectOverride(null);
        exitPreview();
      }
    },
    [automationId, enterPreview, exitPreview, formState],
  );

  // The editor normalizes content on mount (e.g., processing {name} templates),
  // which triggers onChange even without user edits. We track whether the editor
  // has ever been focused - normalization happens before focus is possible, so any
  // onChange before first focus is normalization. After focus, we compare against
  // the normalized baseline to determine dirty state.
  const handleEditorChange = useCallback(
    (lexical: string) => {
      if (!hasEditorBeenFocused.current) {
        // Editor hasn't been focused yet = must be normalization
        normalizedLexical.current = lexical;
        setFormState((state) => ({ ...state, lexical }));
        return;
      }

      // Editor has been focused = compare to baseline
      if (lexical !== normalizedLexical.current) {
        updateForm((state) => ({ ...state, lexical }));
        applyLive({ subject: formStateRef.current.subject, lexical });
      } else {
        // Content reverted to normalized state - don't mark dirty
        setFormState((state) => ({ ...state, lexical }));
        // Hand back the content as it was on open, so the automation compares clean again.
        applyLive({ subject: formStateRef.current.subject, lexical: lexicalAtOpen });
      }
    },
    [applyLive, lexicalAtOpen, setFormState, updateForm],
  );

  // E: the email card's Subject field, kept in the editor's fixed header on the Content tab so
  // it stays in view however far the body scrolls. Same value as the card's and Preview's.
  // E: a TK in the subject gets the post editor's title badge beside the field — out past the
  // panel's right edge with the body's TK reminders — and clicking it selects the TK.
  const subjectTkNow = isCanvasCardV2Editor ? findSubjectTk(formState.subject) : null;
  const subjectField = (
    <div className="relative">
      {subjectTkNow && (
        <button
          className="absolute top-1/2 -translate-y-1/2 rounded-sm bg-state-warning px-1.5 py-0.5 text-2xs font-bold text-foreground"
          style={{ left: `calc(100% + ${overhangsPlus ? 56 : 24}px)` }}
          type="button"
          onClick={(event) => {
            const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>(
              '[data-testid="email-editor-subject"]',
            );
            const tk = input && findSubjectTk(input.value);
            if (input && tk) {
              input.focus();
              input.setSelectionRange(tk.start, tk.end);
            }
          }}
        >
          TK
        </button>
      )}
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>Subject</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Subject line"
          data-testid="email-editor-subject"
          value={formState.subject}
          onChange={(e) => {
            const nextSubject = e.target.value;
            updateForm((state) => ({ ...state, subject: nextSubject }));
            applyLive({
              subject: nextSubject,
              lexical: formStateRef.current.lexical,
            });
            clearError('subject');
          }}
          onKeyDown={(event) => {
            // Tab carries on into the email body, as from a post's title to its content; the
            // header's buttons come before the subject, as they sit above it. Shift+Tab is left
            // to go back up to them.
            if (event.key !== 'Tab' || event.shiftKey) {
              return;
            }
            const editable = editorColumn?.querySelector<HTMLElement>('[contenteditable="true"]');
            if (!editable) {
              return;
            }
            event.preventDefault();
            editable.focus();
            // Caret at the start of the body.
            const range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }}
        />
      </InputGroup>
      {errors.subject && (
        <span className="mt-2 block text-xs text-destructive">{errors.subject}</span>
      )}
    </div>
  );

  return (
    <>
      <Dialog
        modal={false}
        open
        onOpenChange={(next) => {
          if (!next) {
            attemptClose();
          }
        }}
      >
        <DialogContent
          ref={setDialogContentNode}
          aria-describedby={undefined}
          className={cn(
            'top-0 left-0 h-[100dvh] w-full max-w-full translate-0 grid-rows-[1fr] gap-0 rounded-none border-0 p-0 shadow-none outline-hidden sm:rounded-none',
            // B opens exactly like the current editor. C and D grow a panel out of the card
            // over the canvas, so this container is a transparent layer that skips the
            // dialog's default fade and zoom; the panel animates instead.
            expandsInPlace
              ? 'bg-transparent data-[state=open]:animate-none dark:bg-transparent'
              : 'dark:bg-[#151719]',
            expandsInPlace && 'p-4 sm:p-6',
            // D starts below the automation header, which stays in place (see style below).
          )}
          data-sentry-mask="true"
          style={
            clearsCanvas
              ? {
                  top: headerBottom,
                  height: `calc(100dvh - ${headerBottom}px)`,
                  paddingTop: panelGap,
                }
              : undefined
          }
          onClick={(event) => {
            const isBackdrop =
              event.target === event.currentTarget ||
              (event.target instanceof HTMLElement && 'emailEditorScrim' in event.target.dataset);
            if (appliesEditsLive && isBackdrop) {
              attemptClose();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isKoenigPortalFocused()) {
              // prevent Radix dismissing the dialog but let the
              // event through so Koenig can close its popup
              event.preventDefault();
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            attemptClose();
          }}
          onInteractOutside={(event) => {
            // never auto-dismiss on pointer/focus outside — this is a
            // full-screen editor whose only exits are the Close button
            // and Escape. Without this, a non-modal dialog dismisses
            // when Tab lands focus on anything outside it (e.g. Radix's
            // focus-guard spans), which re-triggers attemptClose
            event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            // Concept A's header icon buttons have tooltips, which opening focus would show
            // straight away; the editor takes that focus itself instead.
            if (appliesEditsLive) {
              event.preventDefault();
              if (!(event.currentTarget instanceof HTMLElement)) {
                return;
              }
              // E: the card's message preview carries the subject, so opening from it lands
              // in the subject field, caret at the end — still one click to edit it.
              const subject = isCanvasCardV2Editor
                ? event.currentTarget.querySelector<HTMLInputElement>(
                    '[data-testid="email-editor-subject"]',
                  )
                : null;
              if (subject && subjectTk) {
                subject.focus({ preventScroll: true });
                subject.setSelectionRange(subjectTk.start, subjectTk.end);
              } else if (subject && !opensAtTk) {
                subject.focus({ preventScroll: true });
                subject.setSelectionRange(subject.value.length, subject.value.length);
              } else {
                event.currentTarget.focus();
              }
            }
          }}
        >
          <DialogTitle className="sr-only">Edit email</DialogTitle>
          {expandsInPlace &&
            !clearsCanvas && (
              // C's scrim: covers the whole screen, header included, and only ever fades —
              // useExpandFromCard fades it in step with the panel.
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-black/30 dark:bg-black/60"
                data-email-editor-scrim=""
              />
            )}
          <EmailPreviewModalContent
            ref={expandFromCard.panelRef}
            bodyClassName={cn(
              // E: the scrolling body reaches 72px out past both of the panel's sides (padded back
              // in, so nothing inside moves), far enough to hold the + and TK without clipping
              // them. Its scrollbar is hidden, as it would otherwise sit out on the canvas.
              overhangsPlus &&
                '-mx-[72px] [scrollbar-width:none] px-[72px] [&::-webkit-scrollbar]:hidden',
            )}
            centeredHeaderContent={
              isCanvasCardV2Editor ? undefined : (
                <Tabs
                  data-testid="email-mode-toggle"
                  value={mode}
                  variant="segmented-sm"
                  onValueChange={(value) => value && handleModeChange(value as EmailModalMode)}
                >
                  <TabsList className="grid w-[240px] grid-cols-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                    <TabsTrigger
                      className="w-full justify-center"
                      data-testid="email-mode-edit"
                      value="edit"
                    >
                      {appliesEditsLive ? 'Content' : 'Email content'}
                    </TabsTrigger>
                    <TabsTrigger
                      className="w-full justify-center"
                      data-testid="email-mode-preview"
                      disabled={!automationId}
                      title={
                        !automationId ? 'Save automation to preview or send a test' : undefined
                      }
                      value="preview"
                    >
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )
            }
            className={cn(
              expandsInPlace &&
                'relative mx-auto max-w-[860px] rounded-xl border border-border-default shadow-xl',
              // C stops at 80% of the screen and sits centred on it, leaving room below for the
              // changes bar.
              expandsInPlace && !clearsCanvas && 'max-h-[80vh] self-center',
              // A3 sits on the cleared canvas, so it takes the canvas cards' own shadow.
              clearsCanvas && 'shadow-sm',
              // E hugs its writing column: 600px of content plus 96px each side, which holds
              // Koenig's + button (28px, 66px left of the text) with 30px to spare.
              isCanvasCardV2Editor && 'max-w-[792px]',
              // E: 600px plus 32px each side, and nothing clipped at its edges, so the + and TK
              // can sit out past them. min-h-0 keeps it to the dialog's height: without its
              // clipping, the grid would otherwise grow it to fit the whole email, and the body
              // would never need to scroll.
              overhangsPlus && 'min-h-0 max-w-[664px] overflow-visible',
            )}
            headerActions={
              appliesEditsLive ? (
                <TooltipProvider delayDuration={150}>
                  {hasHeaderIndicator && pendingChanges && (
                    <ChangesIndicator className="mr-1" kind={pendingChanges} />
                  )}
                  {isCanvasCardV2Editor && (
                    // E: icon-only view toggle beside minimize, in place of the centred tabs.
                    <ToggleGroup
                      aria-label="Editor view"
                      data-testid="email-mode-toggle"
                      type="single"
                      value={mode}
                      onValueChange={(value) => value && handleModeChange(value as EmailModalMode)}
                    >
                      <HeaderTooltip label="Content">
                        {/* The trigger wraps the item, as the tooltip's own data-state would
                            otherwise replace the item's data-state="on". */}
                        <span className="inline-flex">
                          <ToggleGroupItem
                            aria-label="Content"
                            data-testid="email-mode-edit"
                            value="edit"
                          >
                            <LucideIcon.PenLine className="size-3.5!" />
                          </ToggleGroupItem>
                        </span>
                      </HeaderTooltip>
                      <HeaderTooltip
                        label={
                          automationId ? 'Preview' : 'Save automation to preview or send a test'
                        }
                      >
                        <span className="inline-flex">
                          <ToggleGroupItem
                            aria-label="Preview"
                            data-testid="email-mode-preview"
                            disabled={!automationId}
                            value="preview"
                          >
                            <LucideIcon.Eye className="size-3.5!" />
                          </ToggleGroupItem>
                        </span>
                      </HeaderTooltip>
                    </ToggleGroup>
                  )}
                  {isFullModal ? (
                    <Button variant="ghost" onClick={closeEditor}>
                      Close
                    </Button>
                  ) : (
                    <HeaderTooltip label="Minimize">
                      <Button
                        aria-label="Minimize editor"
                        size="icon"
                        variant="ghost"
                        onClick={closeEditor}
                      >
                        <LucideIcon.Minimize2 />
                      </Button>
                    </HeaderTooltip>
                  )}
                </TooltipProvider>
              ) : (
                <>
                  <Button variant="outline" onClick={attemptClose}>
                    Close
                  </Button>
                  <Button disabled={okProps.disabled} onClick={() => void handleSaveClick()}>
                    {saveButtonLabel}
                  </Button>
                </>
              )
            }
            headerBelow={isCanvasCardV2Editor && mode === 'edit' ? subjectField : undefined}
            headerClassName={cn(
              appliesEditsLive && 'px-6 py-5',
              // E: 96px at the sides, so the header sits on the body's 600px column; 40px above
              // and below, and no rule under it, so it reads as part of the card.
              isCanvasCardV2Editor && 'border-b-0 px-24 py-10',
              // E: 32px all round, as the body; rounded, now the panel no longer clips its corners.
              overhangsPlus && 'rounded-t-xl p-8',
            )}
            isEditMode={mode === 'edit'}
            title={
              isCanvasCardV2Editor ? (
                // E: the email card's own icon, so the header reads as that card expanded; the
                // subject is edited at the top of the email below.
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded-md bg-muted p-2.5 text-foreground"
                  >
                    <LucideIcon.Mail className="size-4" />
                  </span>
                  <span className="truncate">Edit email</span>
                  {overhangsPlus &&
                    isEmailModified && (
                      // E: the cards' yellow dot after the title, as on the card (8px out: the row's
                      // 12px gap less the dot's own 4px hover padding).
                      <EditedLabel className="-ml-2 h-auto shrink-0" hint={unsavedHint} />
                    )}
                </span>
              ) : appliesEditsLive ? (
                // Concept A: mirrors the email card's header, so the editor reads as that card expanded.
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded-md bg-muted p-2.5 text-foreground"
                  >
                    <LucideIcon.PenLine className="size-4" />
                  </span>
                  <span className="truncate">Edit email</span>
                </span>
              ) : (
                'Edit email'
              )
            }
            titleClassName={cn(appliesEditsLive && 'w-full min-w-0 pr-4 text-md font-medium')}
          >
            <div
              className={cn(
                'flex grow flex-col items-center p-6',
                // E, writing: 96px at the sides, room for Koenig's + button in the left gutter;
                // the header's 40px already sits above, so none on top. Preview keeps 24px all
                // round, so the email sits clear of the header.
                isCanvasCardV2Editor && mode === 'edit' && 'px-24 pt-0',
                // E, preview: 48px on top rather than 24px, so the email sits further under the header.
                isCanvasCardV2Editor && mode === 'preview' && 'pt-12',
                overhangsPlus && mode === 'edit' && 'px-8 pb-8',
              )}
            >
              {mode === 'preview' && (
                <EmailPreviewEmailHeader
                  className={cn(
                    'border-x-0 border-t-0 border-b',
                    // E: the preview keeps to the same 600px column as the writing and header.
                    isCanvasCardV2Editor && 'max-w-[600px]',
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center py-1">
                      <div className="w-20 shrink-0 text-sm font-semibold">From:</div>
                      <div className="min-w-0 grow pr-4 text-sm">
                        <span className="flex gap-1 truncate whitespace-nowrap">
                          <span>{resolvedSenderName}</span>
                          <span className="text-gray-500 dark:text-gray-400">{`<${resolvedSenderEmail}>`}</span>
                        </span>
                      </div>
                      <Popover open={showTestDropdown} onOpenChange={setShowTestDropdown}>
                        <PopoverTrigger asChild>
                          <Button variant="outline">
                            <LucideIcon.Send className="size-4" />
                            Test
                          </Button>
                        </PopoverTrigger>
                        {showTestDropdown && (
                          <TestEmailDropdown
                            automationId={automationId}
                            lexical={formState.lexical}
                            subject={formState.subject}
                            validateForm={validateForTest}
                          />
                        )}
                      </Popover>
                    </div>
                    {hasDistinctReplyTo && (
                      <div className="flex items-center">
                        <div className="w-20 shrink-0 text-sm font-semibold">Reply-to:</div>
                        <div className="grow text-sm text-gray-500 dark:text-gray-400">
                          {resolvedReplyToEmail}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center">
                      <div className="w-20 shrink-0 text-sm font-semibold">Subject:</div>
                      <div className="grow">
                        {isCanvasCardV2Editor ? (
                          // E: the subject is edited in the Content tab's header, so Preview shows
                          // it as plain text, like the From line.
                          <span
                            className={cn(
                              'block truncate text-sm',
                              !formState.subject.trim() && 'text-gray-500 dark:text-gray-400',
                            )}
                            data-testid="email-preview-subject"
                          >
                            {formState.subject.trim() || 'No subject'}
                          </span>
                        ) : (
                          <Input
                            className="w-full"
                            data-testid="email-preview-subject"
                            value={previewSubjectOverride ?? formState.subject}
                            onChange={(e) => {
                              const nextSubject = e.target.value;
                              setPreviewSubjectOverride(nextSubject);
                              updateForm((state) => ({ ...state, subject: nextSubject }));
                              applyLive({
                                subject: nextSubject,
                                lexical: formStateRef.current.lexical,
                              });
                              clearError('subject');
                            }}
                          />
                        )}
                        {errors.subject && (
                          <span className="mt-2 block text-xs text-destructive">
                            {errors.subject}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </EmailPreviewEmailHeader>
              )}
              <EmailPreviewBody
                className={cn(
                  mode === 'preview' && 'bg-white shadow-sm dark:bg-[#151719]',
                  isCanvasCardV2Editor && 'max-w-[600px]',
                  mode === 'edit' && !isCanvasCardV2Editor && 'px-6',
                  mode === 'edit' && 'rounded-lg',
                  mode === 'edit' && errors.lexical && 'border border-red-500',
                )}
              >
                <div
                  ref={isCanvasCardV2Editor ? setEditorColumn : undefined}
                  className={cn(
                    'mx-auto w-full max-w-[600px] pt-10 pb-8 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none',
                    // E: one 24px of padding round the body (from the content area), not three.
                    // Positioned and isolated for the TK indicators drawn over it.
                    isCanvasCardV2Editor && 'relative isolate py-0',
                    // E: the + hangs out over the canvas, so it gets the panel's own fill behind it.
                    overhangsPlus && '[&_[data-kg-plus-button]>button]:bg-surface-elevated',
                    // E: and sits 24px out past the panel's left edge (the body's 32px padding, then
                    // 24px more) — measured from its own right edge, so it holds at every size,
                    // including the narrow breakpoint Koenig leaves unsolved.
                    overhangsPlus &&
                      '[&_[data-kg-plus-button]]:right-[calc(100%+56px)]! [&_[data-kg-plus-button]]:left-auto!',
                    mode === 'preview' && 'hidden',
                  )}
                  data-testid="email-editor"
                  onFocus={() => {
                    hasEditorBeenFocused.current = true;
                  }}
                >
                  <EmailEditor
                    key={editorKey}
                    // E: room below the last line, as the post editor leaves, so a new line near
                    // the bottom (and the + menu that opens from it) can scroll up into view.
                    // Clicks in it still land in the editor, at the end.
                    className={cn('automation-email-editor', overhangsPlus && 'pb-[30vh]')}
                    placeholder="Begin writing your email..."
                    value={formState.lexical}
                    onChange={handleEditorChange}
                  />
                  {isCanvasCardV2Editor && (
                    // E: TK sits 24px out past the panel's right edge (the body's 32px padding, then
                    // 24px more), mirroring the + on the left.
                    <TkIndicators
                      container={editorColumn}
                      offsetFromText={overhangsPlus ? 56 : undefined}
                    />
                  )}
                </div>
                {mode === 'preview' && <EmailPreviewFrame previewState={previewFrameState} />}
              </EmailPreviewBody>
              {mode === 'edit' && errors.lexical && (
                <span className="mt-2 block max-w-[740px] text-xs text-destructive">
                  {errors.lexical}
                </span>
              )}
            </div>
          </EmailPreviewModalContent>
          {/* F only: in E the header's Unsaved changes, just above, covers the open email. */}
          {isCanvasCardV2Editor &&
            isConceptF(conceptAtOpen) &&
            isEmailModified && (
              // E: the same Unsaved marker as on the cards, beside the panel's top-right corner
              // (24px out, level with the header row), so the open email shows its state too.
              <EditedLabel
                // F names the change; E keeps the plain Unsaved changes dot.
                changeKind={isConceptF(conceptAtOpen) ? emailChangeKind : undefined}
                className="absolute animate-in duration-200 fade-in-0 fill-mode-backwards [--tw-animation-delay:200ms] motion-reduce:animate-none"
                revertLabel={revertLabel}
                style={{
                  top: panelGap + 40,
                  left: `calc(50% + ${overhangsPlus ? 332 : 396}px + 24px)`,
                }}
                showText
                // F only: E's marker is information, with no Revert.
                onRevert={isConceptF(conceptAtOpen) ? onRevert : undefined}
              />
            )}
          {expandsInPlace && !clearsCanvas && footer}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={confirmDiscardOpen || isDiscardNavigationBlocked}
        onOpenChange={(open) => {
          if (open) {
            setConfirmDiscardOpen(true);
            return;
          }

          setConfirmDiscardOpen(false);
          if (isDiscardNavigationBlocked) {
            onKeepEditingAfterBlockedNavigation?.();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes to this email haven&apos;t been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscardOpen(false);
                if (isDiscardNavigationBlocked) {
                  onDiscardBlockedNavigation?.();
                  return;
                }

                allowDirtyCloseRef.current = true;
                onDirtyChange?.(false);
                onClose();
              }}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmailContentModal;
