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
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { getEmailValidationErrors } from './validation';
import { useBrowseAutomatedEmails } from '@tryghost/admin-x-framework/api/automated-emails';
import { useEmailPreview } from './use-email-preview';
import { useEmailSenderDetails } from './use-sender-details';
import { useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { usePreviewAutomationEmail } from '@tryghost/admin-x-framework/api/automations';
import { isConceptA, useConcept } from '@/automations/concepts/concept';
import { useExpandFromCard } from '@/automations/concepts/use-expand-from-card';
import ChangesIndicator from '@/automations/concepts/changes-indicator';
import type { PendingChangesKind } from '@/automations/concepts/pending-changes';
import type { EmailModalMode } from '@/automations/components/types';

interface EmailPreviewModalContentProps {
  title: React.ReactNode;
  titleClassName?: string;
  headerClassName?: string;
  centeredHeaderContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
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
      children,
      className,
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
      </div>
      <div className="flex min-h-0 grow [scrollbar-gutter:stable] flex-col overflow-y-auto">
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
  // NY-1715 concept C: shown below the panel, on the scrim — never inside the editor.
  footer?: React.ReactNode;
  // NY-1715 concept D: called as the editor starts closing, so the canvas can bring its
  // sidebar back in step with the shrink.
  onCloseStart?: () => void;
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
  footer,
  onCloseStart,
}) => {
  // Concept A applies edits straight to the automation, like edits made on the
  // canvas, so the modal has no save step of its own. Read once so switching
  // concepts mid-edit can't leave the modal half in each mode.
  const conceptAtOpen = useConcept();
  const [appliesEditsLive] = useState(isConceptA(conceptAtOpen));
  // A2 and A3: the panel grows out of the email card. A2 settles as a narrower panel under
  // the automation header.
  const [expandsInPlace] = useState(conceptAtOpen === 'a2' || conceptAtOpen === 'a3');
  // A3: same panel as A2, centred on a cleared canvas instead of over a scrim.
  const [clearsCanvas] = useState(conceptAtOpen === 'a3');
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
  const [lexicalAtOpen] = useState(initialLexical || '');
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
              if (event.currentTarget instanceof HTMLElement) {
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
            centeredHeaderContent={
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
                    title={!automationId ? 'Save automation to preview or send a test' : undefined}
                    value="preview"
                  >
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
            className={cn(
              expandsInPlace &&
                'relative mx-auto max-w-[860px] rounded-xl border border-border-default shadow-xl',
              // C stops at 80% of the screen and sits centred on it, leaving room below for the
              // changes bar.
              expandsInPlace && !clearsCanvas && 'max-h-[80vh] self-center',
              // A3 sits on the cleared canvas, so it takes the canvas cards' own shadow.
              clearsCanvas && 'shadow-sm',
            )}
            headerActions={
              appliesEditsLive ? (
                <TooltipProvider delayDuration={150}>
                  {hasHeaderIndicator && pendingChanges && (
                    <ChangesIndicator className="mr-1" kind={pendingChanges} />
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
            headerClassName={cn(appliesEditsLive && 'px-6 py-5')}
            isEditMode={mode === 'edit'}
            title={
              appliesEditsLive ? (
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
            <div className="flex grow flex-col items-center p-6">
              {mode === 'preview' && (
                <EmailPreviewEmailHeader className="border-x-0 border-t-0 border-b">
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
                  mode === 'edit' && 'px-6',
                  mode === 'edit' && 'rounded-lg',
                  mode === 'edit' && errors.lexical && 'border border-red-500',
                )}
              >
                <div
                  className={cn(
                    'mx-auto w-full max-w-[600px] pt-10 pb-8 transition-[max-width,padding] duration-300 ease-out motion-reduce:transition-none',
                    mode === 'preview' && 'hidden',
                  )}
                  data-testid="email-editor"
                  onFocus={() => {
                    hasEditorBeenFocused.current = true;
                  }}
                >
                  <EmailEditor
                    className="automation-email-editor"
                    placeholder="Begin writing your email..."
                    value={formState.lexical}
                    onChange={handleEditorChange}
                  />
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
