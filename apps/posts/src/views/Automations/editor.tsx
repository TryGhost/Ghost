import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, LoadingIndicator} from '@tryghost/shade/components';
import {AutomationStatus, useEditAutomation, useReadAutomation} from '@tryghost/admin-x-framework/api/automations';
import {useParams} from '@tryghost/admin-x-framework';
import type {AutomationEditState} from './types';

const AutomationEditor: React.FC = () => {
    const {id = ''} = useParams<{id: string}>();

    const {data, isLoading: isLoadingAutomation, isError} = useReadAutomation(id, {
        defaultErrorHandler: false
    });
    const automation = data?.automations[0];

    const editMutation = useEditAutomation();
    const [editState, setEditState] = React.useState<AutomationEditState>('idle');
    const editStatus = (status: AutomationStatus): void => {
        if (!automation) {
            throw new Error('Cannot edit an automation that has not loaded.');
        }
        let errorState: AutomationEditState;
        switch (status) {
        case 'active':
            setEditState('publishing');
            errorState = 'failed to publish';
            break;
        case 'inactive':
            setEditState('unpublishing');
            errorState = 'failed to unpublish';
            break;
        default: {
            const _exhaustive: never = status;
            throw new Error(`Unhandled status: ${_exhaustive}`);
        }
        }
        editMutation.mutate(
            {
                id: automation.id,
                status,
                actions: automation.actions,
                edges: automation.edges
            },
            {
                onSuccess: () => setEditState('idle'),
                onError: () => setEditState(errorState)
            }
        );
    };

    let isConfirmUnpublishAlertOpen = false;
    let isEditRequestActive = false;
    let turnOffButtonChildren: React.ReactNode = 'Turn off';
    switch (editState) {
    case 'publishing':
        isEditRequestActive = true;
        break;
    case 'unpublishing':
        isEditRequestActive = true;
        isConfirmUnpublishAlertOpen = true;
        turnOffButtonChildren = (
            <>
                <LoadingIndicator color='light' size='sm' />
                Turning off...
            </>
        );
        break;
    case 'confirming unpublish':
        isConfirmUnpublishAlertOpen = true;
        break;
    case 'failed to unpublish':
        isConfirmUnpublishAlertOpen = true;
        turnOffButtonChildren = 'Retry';
        break;
    }

    const onConfirmUnpublishOpenChange = (open: boolean): void => {
        setEditState((oldEditState) => {
            switch (oldEditState) {
            case 'idle':
            case 'failed to publish':
                return open ? 'confirming unpublish' : oldEditState;
            case 'failed to unpublish':
                return open ? 'confirming unpublish' : 'idle';
            case 'publishing':
                throw new Error('It should be impossible to hit this state');
            case 'unpublishing':
                return oldEditState;
            case 'confirming unpublish':
                return 'idle';
            default: {
                const _exhaustive: never = oldEditState;
                throw new Error(`Unexpected edit state ${_exhaustive}`);
            }
            }
        });
    };

    return (
        <div className='flex h-full w-full flex-col' data-testid='automation-editor'>
            <AutomationHeader
                automation={automation}
                editState={editState}
                isLoadingAutomation={isLoadingAutomation}
                onPublish={() => editStatus('active')}
                onTurnOff={() => setEditState('confirming unpublish')}
            />

            <AutomationCanvas automation={automation} isError={isError} isLoading={isLoadingAutomation} />

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
                            onClick={() => editStatus('inactive')}
                        >
                            {turnOffButtonChildren}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AutomationEditor;
