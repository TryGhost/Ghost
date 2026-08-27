import AutomationCanvas, { EMAIL_STEP_QUERY_PARAM } from './components/canvas/automation-canvas';
import AutomationHeader from './components/automation-header';
import { useAutomationForEditing } from './hooks/use-automation-for-editing';
import React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  type ButtonProps,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { useEditAutomation } from '@tryghost/admin-x-framework/api/automations';
import type {
  AutomationDetail,
  AutomationStatus,
} from '@tryghost/admin-x-framework/api/automations';
import { dequal } from 'dequal';
import { isEmptyEmailLexical } from './utils';
import { toast } from 'sonner';
import { useParams } from '@tryghost/admin-x-framework';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { AutomationEditState } from './types';

const SUBJECT_REQUIRED_MESSAGE = 'Add a subject line.';
const BODY_REQUIRED_MESSAGE = 'Add an email body.';
const SUBJECT_AND_BODY_REQUIRED_MESSAGE = 'Add a subject line and email body.';

const editableSlice = (automation: AutomationDetail) => ({
  status: automation.status,
  actions: automation.actions,
  edges: automation.edges,
});

const isFailedEditState = (editState: AutomationEditState): boolean => {
  return editState.phase === 'failed';
};

const getActionErrors = (automation: AutomationDetail): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const action of automation.actions) {
    if (action.type !== 'send_email') {
      continue;
    }

    const missingSubject = !action.data.email_subject.trim();
    const missingBody = isEmptyEmailLexical(action.data.email_lexical);

    if (missingSubject && missingBody) {
      errors[action.id] = SUBJECT_AND_BODY_REQUIRED_MESSAGE;
    } else if (missingSubject) {
      errors[action.id] = SUBJECT_REQUIRED_MESSAGE;
    } else if (missingBody) {
      errors[action.id] = BODY_REQUIRED_MESSAGE;
    }
  }

  return errors;
};

const AutomationEditorContent: React.FC<{ automationId: string }> = ({ automationId }) => {
  const { automation, isError: isReadError } = useAutomationForEditing(automationId);

  const editMutation = useEditAutomation();
  const [editState, setEditState] = React.useState<AutomationEditState>({ phase: 'idle' });
  const [actionErrors, setActionErrors] = React.useState<Record<string, string>>({});
  const [isEmailModalDirty, setIsEmailModalDirty] = React.useState(false);
  const isEmailModalDirtyRef = React.useRef(false);
  const isBlockedEmailNavigationLeavingEditorRef = React.useRef(false);

  // Keep the saved snapshot separate from the live query result. Later query updates or errors
  // must not redefine the dirty state or overwrite edits made during this editing session.
  const [savedAutomation, setSavedAutomation] = React.useState<AutomationDetail | undefined>(
    undefined,
  );
  const [draft, setDraft] = React.useState<AutomationDetail | undefined>(undefined);
  React.useEffect(() => {
    if (!automation) {
      return;
    }

    setSavedAutomation((currentAutomation) => currentAutomation ?? automation);
    setDraft((currentDraft) => currentDraft ?? automation);
  }, [automation]);
  const isEditorLoading = !draft && !isReadError;
  const isEditorError = !draft && isReadError;

  // Only compare the fields the user can edit; server-stamped fields like `updated_at` would
  // otherwise flip the dirty flag immediately after every successful publish.
  const hasUnsavedChanges =
    !!draft && !!savedAutomation && !dequal(editableSlice(draft), editableSlice(savedAutomation));

  const onDraftChange = (next: AutomationDetail) => {
    setDraft(next);
    setActionErrors((oldErrors) => {
      if (Object.keys(oldErrors).length === 0) {
        return oldErrors;
      }

      const nextErrors = getActionErrors(next);
      return Object.fromEntries(
        Object.entries(oldErrors).filter(([actionId]) => nextErrors[actionId]),
      );
    });
    setEditState((prev) => (isFailedEditState(prev) ? { phase: 'idle' } : prev));
  };

  const validateActionErrors = (
    automationToValidate: AutomationDetail,
    errorState: AutomationEditState,
  ): boolean => {
    const nextActionErrors = getActionErrors(automationToValidate);
    if (Object.keys(nextActionErrors).length > 0) {
      setActionErrors(nextActionErrors);
      setEditState(errorState);
      toast.error('Automation needs a few details', {
        description: 'Fix the highlighted steps and try again.',
      });
      return false;
    }

    return true;
  };

  const save = (statusToSave?: AutomationStatus) => {
    if (!draft) {
      throw new Error('Cannot edit an automation that has not loaded.');
    }

    let requestState: AutomationEditState;
    let errorState: AutomationEditState;

    const oldStatus = draft.status;
    const newStatus = statusToSave ?? oldStatus;
    const statusTransition: `${AutomationStatus} -> ${AutomationStatus}` = `${oldStatus} -> ${newStatus}`;
    switch (statusTransition) {
      case 'active -> active':
        requestState = { phase: 'submitting', action: 'republish' };
        errorState = { phase: 'failed', action: 'republish' };
        break;
      case 'inactive -> inactive':
        requestState = { phase: 'submitting', action: 'save' };
        errorState = { phase: 'failed', action: 'save' };
        break;
      case 'inactive -> active':
        requestState = { phase: 'submitting', action: 'publish' };
        errorState = { phase: 'failed', action: 'publish' };
        break;
      case 'active -> inactive':
        requestState = { phase: 'submitting', action: 'unpublish' };
        errorState = { phase: 'failed', action: 'unpublish' };
        break;
      default: {
        const _exhaustive: never = statusTransition;
        throw new Error(`Unhandled status transition: ${String(_exhaustive)}`);
      }
    }

    if (newStatus === 'active' && !validateActionErrors(draft, errorState)) {
      return;
    }

    setEditState(requestState);

    editMutation.mutate(
      {
        id: draft.id,
        status: newStatus,
        actions: draft.actions,
        edges: draft.edges,
      },
      {
        onSuccess: (response) => {
          const savedDraft = response.automations[0];
          setSavedAutomation(savedDraft);
          setDraft(savedDraft);
          setActionErrors({});
          setEditState({ phase: 'idle' });
        },
        onError: (error) => {
          void error;
          const nextActionErrors = newStatus === 'active' ? getActionErrors(draft) : {};
          const hasActionErrors = Object.keys(nextActionErrors).length > 0;
          if (hasActionErrors) {
            setActionErrors(nextActionErrors);
          }

          setEditState(errorState);
          if (hasActionErrors) {
            toast.error('Automation needs a few details', {
              description: 'Fix the highlighted steps and try again.',
            });
          } else {
            toast.error('Automation couldn’t be saved');
          }
        },
      },
    );
  };

  const isConfirmPublishAlertOpen = editState.action === 'publish';
  const isConfirmUnpublishAlertOpen = editState.action === 'unpublish';
  const isConfirmRepublishAlertOpen = editState.action === 'republish';
  const isEditRequestActive = editState.phase === 'submitting';
  let isSaveButtonEnabled =
    !!draft && draft.actions.length > 0 && draft.status === 'inactive' && hasUnsavedChanges;
  let saveButtonVariant: ButtonProps['variant'] = 'outline';
  let saveButtonChildren: React.ReactNode = 'Save';
  let isPublishButtonEnabled =
    !!draft && draft.actions.length > 0 && (draft.status === 'inactive' || hasUnsavedChanges);
  const publishButtonVariant: ButtonProps['variant'] = 'default';
  const publishButtonChildren: React.ReactNode =
    draft?.status === 'active' ? (hasUnsavedChanges ? 'Publish changes' : 'Published') : 'Publish';
  let isTurnOffButtonEnabled = true;
  let turnOffButtonChildren: React.ReactNode = 'Turn off';
  let isPublishConfirmButtonEnabled = true;
  let publishConfirmButtonVariant: ButtonProps['variant'] = 'default';
  let publishConfirmButtonChildren: React.ReactNode = 'Publish';
  let isRepublishButtonEnabled = true;
  let republishButtonVariant: ButtonProps['variant'] = 'default';
  let republishButtonChildren: React.ReactNode = 'Publish changes';
  switch (editState.phase) {
    case 'idle':
      break;
    case 'submitting':
      isSaveButtonEnabled = false;
      isPublishButtonEnabled = false;
      isTurnOffButtonEnabled = false;

      switch (editState.action) {
        case 'save':
          saveButtonChildren = (
            <>
              <LoadingIndicator size="sm" />
              <span className="sr-only">Saving...</span>
            </>
          );
          break;
        case 'publish':
          isPublishConfirmButtonEnabled = false;
          publishConfirmButtonChildren = (
            <>
              <LoadingIndicator color="light" size="sm" />
              <span className="sr-only">Publishing...</span>
            </>
          );
          break;
        case 'republish':
          isRepublishButtonEnabled = false;
          republishButtonChildren = (
            <>
              <LoadingIndicator color="light" size="sm" />
              <span className="sr-only">Publishing...</span>
            </>
          );
          break;
        case 'unpublish':
          turnOffButtonChildren = (
            <>
              <LoadingIndicator color="light" size="sm" />
              <span className="sr-only">Turning off...</span>
            </>
          );
          break;
      }
      break;
    case 'confirming':
      switch (editState.action) {
        case 'publish':
          isSaveButtonEnabled = false;
          isPublishButtonEnabled = false;
          break;
        case 'republish':
          isPublishButtonEnabled = false;
          isTurnOffButtonEnabled = false;
          break;
        case 'unpublish':
          isSaveButtonEnabled = false;
          isPublishButtonEnabled = false;
          isTurnOffButtonEnabled = false;
          break;
      }
      break;
    case 'failed':
      switch (editState.action) {
        case 'save':
          saveButtonVariant = 'destructive';
          saveButtonChildren = 'Retry';
          break;
        case 'publish':
          isSaveButtonEnabled = false;
          isPublishButtonEnabled = false;
          publishConfirmButtonVariant = 'destructive';
          publishConfirmButtonChildren = 'Retry';
          break;
        case 'republish':
          isPublishButtonEnabled = false;
          isTurnOffButtonEnabled = false;
          republishButtonVariant = 'destructive';
          republishButtonChildren = 'Retry';
          break;
        case 'unpublish':
          isTurnOffButtonEnabled = true;
          turnOffButtonChildren = 'Retry';
          break;
      }
      break;
    default: {
      const _exhaustive: never = editState;
      throw new Error(`Unhandled edit state: ${String(_exhaustive)}`);
    }
  }

  const onConfirmUnpublishOpenChange = (open: boolean): void => {
    setEditState((oldEditState) => {
      switch (oldEditState.phase) {
        case 'confirming':
        case 'failed':
          return oldEditState.action === 'unpublish' && !open ? { phase: 'idle' } : oldEditState;
        case 'idle':
          return open ? { phase: 'confirming', action: 'unpublish' } : oldEditState;
        default:
          return oldEditState;
      }
    });
  };

  const onConfirmPublishOpenChange = (open: boolean): void => {
    setEditState((oldEditState) => {
      switch (oldEditState.phase) {
        case 'confirming':
        case 'failed':
          return oldEditState.action === 'publish' && !open ? { phase: 'idle' } : oldEditState;
        case 'idle':
          return open ? { phase: 'confirming', action: 'publish' } : oldEditState;
        default:
          return oldEditState;
      }
    });
  };

  const onConfirmRepublishOpenChange = (open: boolean): void => {
    setEditState((oldEditState) => {
      switch (oldEditState.phase) {
        case 'confirming':
        case 'failed':
          return oldEditState.action === 'republish' && !open ? { phase: 'idle' } : oldEditState;
        case 'idle':
          return open ? { phase: 'confirming', action: 'republish' } : oldEditState;
        default:
          return oldEditState;
      }
    });
  };

  const onPublish = (): void => {
    if (!draft) {
      throw new Error('Cannot publish an automation that has not loaded.');
    }

    switch (draft.status) {
      case 'active':
        if (!validateActionErrors(draft, { phase: 'idle' })) {
          return;
        }
        setEditState({ phase: 'confirming', action: 'republish' });
        break;
      case 'inactive':
        if (!validateActionErrors(draft, { phase: 'idle' })) {
          return;
        }
        setEditState({ phase: 'confirming', action: 'publish' });
        break;
      default: {
        const _exhaustive: never = draft.status;
        throw new Error(`Unhandled status: ${String(_exhaustive)}`);
      }
    }
  };

  // The dirty email modal claims navigations that change its `emailStep`
  // query param (closing the modal, back button, leaving the editor) so the
  // canvas can run its own discard flow instead of the page-level dialog.
  const { dialogProps: discardDialogProps, interceptedNavigation } = useUnsavedChangesGuard({
    when: hasUnsavedChanges || isEmailModalDirty,
    confirmUnloadWhen: isEditRequestActive || hasUnsavedChanges || isEmailModalDirty,
    interceptNavigation: ({ currentLocation, nextLocation }) => {
      const currentEmailStep = new URLSearchParams(currentLocation.search).get(
        EMAIL_STEP_QUERY_PARAM,
      );
      const nextEmailStep = new URLSearchParams(nextLocation.search).get(EMAIL_STEP_QUERY_PARAM);
      if (isEmailModalDirtyRef.current && currentEmailStep && currentEmailStep !== nextEmailStep) {
        isBlockedEmailNavigationLeavingEditorRef.current =
          currentLocation.pathname !== nextLocation.pathname;
        return true;
      }

      isBlockedEmailNavigationLeavingEditorRef.current = false;
      return false;
    },
  });
  const isEmailNavigationBlocked = interceptedNavigation.isBlocked;

  const onEmailDirtyChange = React.useCallback((dirty: boolean) => {
    isEmailModalDirtyRef.current = dirty;
    setIsEmailModalDirty(dirty);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      data-sentry-mask="true"
      data-testid="automation-editor"
    >
      <AutomationHeader
        automation={draft}
        isLoadingAutomation={isEditorLoading}
        isPublishButtonEnabled={isPublishButtonEnabled}
        isSaveButtonEnabled={isSaveButtonEnabled}
        isTurnOffButtonEnabled={isTurnOffButtonEnabled}
        publishButtonChildren={publishButtonChildren}
        publishButtonVariant={publishButtonVariant}
        saveButtonChildren={saveButtonChildren}
        saveButtonVariant={saveButtonVariant}
        onPublish={onPublish}
        onSave={() => save()}
        onTurnOff={() => setEditState({ phase: 'confirming', action: 'unpublish' })}
      />

      <AutomationCanvas
        actionErrors={actionErrors}
        automation={draft}
        isEmailNavigationBlocked={isEmailNavigationBlocked}
        isError={isEditorError}
        isLoading={isEditorLoading}
        onChange={onDraftChange}
        onDiscardBlockedEmailNavigation={(closeEmailModal) => {
          onEmailDirtyChange(false);
          if (isBlockedEmailNavigationLeavingEditorRef.current) {
            isBlockedEmailNavigationLeavingEditorRef.current = false;
            interceptedNavigation.reset();
            closeEmailModal();
            return;
          }

          isBlockedEmailNavigationLeavingEditorRef.current = false;
          interceptedNavigation.proceed();
        }}
        onEmailDirtyChange={onEmailDirtyChange}
        onKeepEditingAfterBlockedEmailNavigation={() => {
          isBlockedEmailNavigationLeavingEditorRef.current = false;
          interceptedNavigation.reset();
        }}
      />

      <DirtyConfirmDialog {...discardDialogProps} />

      <AlertDialog open={isConfirmPublishAlertOpen} onOpenChange={onConfirmPublishOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start your automation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once published, your automation goes live. Any member who meets the trigger will be
              enrolled automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditRequestActive}>Cancel</AlertDialogCancel>
            <Button
              disabled={!isPublishConfirmButtonEnabled}
              variant={publishConfirmButtonVariant}
              onClick={() => save('active')}
            >
              {publishConfirmButtonChildren}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmUnpublishAlertOpen} onOpenChange={onConfirmUnpublishOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off automation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your automation will no longer run, and any members currently in progress will be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditRequestActive}>Cancel</AlertDialogCancel>
            <Button
              disabled={isEditRequestActive}
              variant={
                editState.phase === 'failed' && editState.action === 'unpublish'
                  ? 'destructive'
                  : 'default'
              }
              onClick={() => save('inactive')}
            >
              {turnOffButtonChildren}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmRepublishAlertOpen} onOpenChange={onConfirmRepublishOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update your automation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once published, your changes apply immediately to members already in progress and to
              any new members who enter the automation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditRequestActive}>Cancel</AlertDialogCancel>
            <Button
              disabled={!isRepublishButtonEnabled}
              variant={republishButtonVariant}
              onClick={() => save()}
            >
              {republishButtonChildren}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AutomationEditor: React.FC = () => {
  const { id: automationId = '' } = useParams<{ id: string }>();

  return <AutomationEditorContent key={automationId} automationId={automationId} />;
};

export default AutomationEditor;
