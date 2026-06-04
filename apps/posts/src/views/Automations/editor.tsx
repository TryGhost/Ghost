import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, type ButtonProps, LoadingIndicator} from '@tryghost/shade/components';
import {AutomationDetail, AutomationStatus, useEditAutomation, useReadAutomation} from '@tryghost/admin-x-framework/api/automations';
import {dequal} from 'dequal';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useConfirmUnload, useParams} from '@tryghost/admin-x-framework';
import type {AutomationEditState} from './types';

const SUBJECT_REQUIRED_MESSAGE = 'Add a subject line.';
const BODY_REQUIRED_MESSAGE = 'Add an email body.';
const SUBJECT_AND_BODY_REQUIRED_MESSAGE = 'Add a subject line and email body.';

const isEmptyEmailLexical = (lexical: string | null | undefined): boolean => {
    if (!lexical) {
        return true;
    }

    try {
        const parsed = JSON.parse(lexical);
        const children = parsed?.root?.children;

        if (!children || children.length === 0) {
            return true;
        }

        return children.length === 1 && children[0].type === 'paragraph' && (!children[0].children || children[0].children.length === 0);
    } catch {
        return true;
    }
};

const editableSlice = (automation: AutomationDetail) => ({
    status: automation.status,
    actions: automation.actions,
    edges: automation.edges
});

const isFailedEditState = (editState: AutomationEditState): boolean => {
    switch (editState) {
    case 'failed to publish':
    case 'failed to re-publish':
    case 'failed to save':
    case 'failed to unpublish':
        return true;
    case 'confirming re-publish':
    case 'confirming unpublish':
    case 'idle':
    case 'publishing':
    case 're-publishing':
    case 'saving':
    case 'unpublishing':
        return false;
    default: {
        const _exhaustive: never = editState;
        throw new Error(`Unhandled edit state: ${_exhaustive}`);
    }
    }
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

const AutomationEditor: React.FC = () => {
    const {id = ''} = useParams<{id: string}>();

    const {data, isLoading: isLoadingAutomation, isError} = useReadAutomation(id, {
        defaultErrorHandler: false
    });
    const automation = data?.automations[0];

    const editMutation = useEditAutomation();
    const [editState, setEditState] = React.useState<AutomationEditState>('idle');
    const [actionErrors, setActionErrors] = React.useState<Record<string, string>>({});

    // Draft is the user-facing, locally mutable copy. The React Query cache stays as server truth;
    // staged edits (adding steps, etc.) live here until the user publishes. Seeded once when the
    // automation first loads, and reset to the response after every successful edit.
    const [draft, setDraft] = React.useState<AutomationDetail | undefined>(undefined);
    React.useEffect(() => {
        if (automation) {
            setDraft((oldDraft) => {
                return oldDraft?.id === automation.id ? oldDraft : automation;
            });
        }
    }, [automation]);

    // Only compare the fields the user can edit; server-stamped fields like `updated_at` would
    // otherwise flip the dirty flag immediately after every successful publish.
    const hasUnsavedChanges = !!draft
        && !!automation
        && !dequal(editableSlice(draft), editableSlice(automation));

    const onDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        setActionErrors((oldErrors) => {
            if (Object.keys(oldErrors).length === 0) {
                return oldErrors;
            }

            const nextErrors = getActionErrors(next);
            return Object.fromEntries(
                Object.entries(oldErrors).filter(([actionId]) => nextErrors[actionId])
            );
        });
        setEditState(prev => (
            isFailedEditState(prev) ? 'idle' : prev
        ));
    };

    const validateActionErrors = (automationToValidate: AutomationDetail, errorState: AutomationEditState): boolean => {
        const nextActionErrors = getActionErrors(automationToValidate);
        if (Object.keys(nextActionErrors).length > 0) {
            setActionErrors(nextActionErrors);
            setEditState(errorState);
            toast.error('Automation couldn’t be saved', {
                description: 'Fix the highlighted steps and try again.'
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
            requestState = 're-publishing';
            errorState = 'failed to re-publish';
            break;
        case 'inactive -> inactive':
            requestState = 'saving';
            errorState = 'failed to save';
            break;
        case 'inactive -> active':
            requestState = 'publishing';
            errorState = 'failed to publish';
            break;
        case 'active -> inactive':
            requestState = 'unpublishing';
            errorState = 'failed to unpublish';
            break;
        default: {
            const _exhaustive: never = statusTransition;
            throw new Error(`Unhandled status transition: ${_exhaustive}`);
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
                edges: draft.edges
            },
            {
                onSuccess: (response) => {
                    setDraft(response.automations[0]);
                    setActionErrors({});
                    setEditState('idle');
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
                        toast.error('Automation couldn’t be saved', {
                            description: 'Fix the highlighted steps and try again.'
                        });
                    } else {
                        toast.error('Automation couldn’t be saved');
                    }
                }
            }
        );
    };

    let isConfirmUnpublishAlertOpen = false;
    let isConfirmRepublishAlertOpen = false;
    let isEditRequestActive = false;
    let isSaveButtonEnabled = !!draft && draft.actions.length > 0 && draft.status === 'inactive' && hasUnsavedChanges;
    let saveButtonVariant: ButtonProps['variant'] = 'secondary';
    let saveButtonChildren: React.ReactNode = 'Save';
    let isPublishButtonEnabled = !!draft && draft.actions.length > 0 && (draft.status === 'inactive' || hasUnsavedChanges);
    let publishButtonVariant: ButtonProps['variant'] = 'default';
    let publishButtonChildren: React.ReactNode = draft?.status === 'active'
        ? (hasUnsavedChanges ? 'Publish changes' : 'Published')
        : 'Publish';
    let isTurnOffButtonEnabled = true;
    let turnOffButtonChildren: React.ReactNode = 'Turn off';
    let isRepublishButtonEnabled = true;
    let republishButtonVariant: ButtonProps['variant'] = 'default';
    let republishButtonChildren: React.ReactNode = 'Publish changes';
    switch (editState) {
    case 'idle':
        break;
    case 'saving':
        isEditRequestActive = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        saveButtonChildren = (
            <>
                <LoadingIndicator size='sm' />
                <span className='sr-only'>Saving...</span>
            </>
        );
        break;
    case 'publishing':
        isEditRequestActive = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        publishButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                <span className='sr-only'>Publishing...</span>
            </>
        );
        break;
    case 're-publishing':
        isEditRequestActive = true;
        isConfirmRepublishAlertOpen = true;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        isRepublishButtonEnabled = false;
        republishButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                <span className='sr-only'>Publishing...</span>
            </>
        );
        break;
    case 'unpublishing':
        isEditRequestActive = true;
        isConfirmUnpublishAlertOpen = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        turnOffButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                <span className='sr-only'>Turning off...</span>
            </>
        );
        break;
    case 'confirming unpublish':
        isConfirmUnpublishAlertOpen = true;
        isSaveButtonEnabled = false;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'confirming re-publish':
        isConfirmRepublishAlertOpen = true;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        break;
    case 'failed to save':
        saveButtonVariant = 'destructive';
        saveButtonChildren = 'Retry';
        break;
    case 'failed to publish':
        publishButtonVariant = 'destructive';
        publishButtonChildren = 'Retry';
        break;
    case 'failed to re-publish':
        isConfirmRepublishAlertOpen = true;
        isPublishButtonEnabled = false;
        isTurnOffButtonEnabled = false;
        republishButtonVariant = 'destructive';
        republishButtonChildren = 'Retry';
        break;
    case 'failed to unpublish':
        isConfirmUnpublishAlertOpen = true;
        isTurnOffButtonEnabled = true;
        turnOffButtonChildren = 'Retry';
        break;
    default: {
        const _exhaustive: never = editState;
        throw new Error(`Unhandled edit state: ${_exhaustive}`);
    }
    }

    const onConfirmUnpublishOpenChange = (open: boolean): void => {
        setEditState((oldEditState) => {
            switch (oldEditState) {
            case 'confirming unpublish':
            case 'failed to unpublish':
                return open ? oldEditState : 'idle';
            case 'idle':
                return open ? 'confirming unpublish' : oldEditState;
            default:
                return oldEditState;
            }
        });
    };

    const onConfirmRepublishOpenChange = (open: boolean): void => {
        setEditState((oldEditState) => {
            switch (oldEditState) {
            case 'confirming re-publish':
            case 'failed to re-publish':
                return open ? oldEditState : 'idle';
            case 'idle':
                return open ? 'confirming re-publish' : oldEditState;
            default:
                return oldEditState;
            }
        });
    };

    const onPublish = (): void => {
        const draftStatus = draft?.status;
        switch (draftStatus) {
        case undefined:
            throw new Error('Cannot publish an automation that has not loaded.');
        case 'active':
            setEditState('confirming re-publish');
            break;
        case 'inactive':
            save('active');
            break;
        default: {
            const _exhaustive: never = draftStatus;
            throw new Error(`Unhandled status: ${_exhaustive}`);
        }
        }
    };

    useConfirmUnload(isEditRequestActive || hasUnsavedChanges);
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => (
        hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
    ));

    const onConfirmDiscardOpenChange = (open: boolean): void => {
        if (!open && navigationBlocker.state === 'blocked') {
            navigationBlocker.reset();
        }
    };

    return (
        <div className='fixed inset-0 z-50 flex flex-col bg-background' data-testid='automation-editor'>
            <AutomationHeader
                automation={draft}
                isLoadingAutomation={isLoadingAutomation}
                isPublishButtonEnabled={isPublishButtonEnabled}
                isSaveButtonEnabled={isSaveButtonEnabled}
                isTurnOffButtonEnabled={isTurnOffButtonEnabled}
                publishButtonChildren={publishButtonChildren}
                publishButtonVariant={publishButtonVariant}
                saveButtonChildren={saveButtonChildren}
                saveButtonVariant={saveButtonVariant}
                onPublish={onPublish}
                onSave={() => save()}
                onTurnOff={() => setEditState('confirming unpublish')}
            />

            <AutomationCanvas
                actionErrors={actionErrors}
                automation={draft}
                isError={isError}
                isLoading={isLoadingAutomation}
                onChange={onDraftChange}
            />

            <AlertDialog
                open={navigationBlocker.state === 'blocked'}
                onOpenChange={onConfirmDiscardOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your changes will be lost if you leave this automation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep working</AlertDialogCancel>
                        <Button
                            variant='destructive'
                            onClick={() => navigationBlocker.proceed?.()}
                        >
                            Discard changes
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={isConfirmUnpublishAlertOpen}
                onOpenChange={onConfirmUnpublishOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Turn off this automation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It will stop running until you turn it back on.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isEditRequestActive}>Cancel</AlertDialogCancel>
                        <Button
                            disabled={isEditRequestActive}
                            variant={editState === 'failed to unpublish' ? 'destructive' : 'default'}
                            onClick={() => save('inactive')}
                        >
                            {turnOffButtonChildren}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={isConfirmRepublishAlertOpen}
                onOpenChange={onConfirmRepublishOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Update automation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will update the automation for new runs of the automation, as well as any actively-running ones.
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

export default AutomationEditor;
