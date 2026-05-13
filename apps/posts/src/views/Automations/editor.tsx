import AutomationCanvas from './components/automation-canvas';
import AutomationHeader, {type AutomationRequestState} from './components/automation-header';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, LoadingIndicator} from '@tryghost/shade/components';
import {useEditAutomation, useReadAutomation} from '@tryghost/admin-x-framework/api/automations';
import {useParams} from '@tryghost/admin-x-framework';

type ErrorKind = 'publish' | 'unpublish';

const AutomationEditor: React.FC = () => {
    const {id = ''} = useParams<{id: string}>();
    const {data, isLoading: isLoadingAutomation, isError} = useReadAutomation(id, {
        defaultErrorHandler: false
    });

    const automation = data?.automations[0];

    const editMutation = useEditAutomation();
    const pendingStatus = editMutation.isLoading && editMutation.variables?.id === automation?.id
        ? editMutation.variables?.status
        : undefined;

    const [isConfirmingUnpublish, setIsConfirmingUnpublish] = React.useState(false);
    const [requestStates, setRequestStates] = React.useState<Record<ErrorKind, AutomationRequestState>>({
        publish: 'idle',
        unpublish: 'idle'
    });

    React.useEffect(() => {
        setRequestStates({publish: 'idle', unpublish: 'idle'});
        setIsConfirmingUnpublish(false);
    }, [automation?.id]);

    const publishState = pendingStatus === 'active' ? 'loading' : requestStates.publish;
    const unpublishState = pendingStatus === 'inactive' ? 'loading' : requestStates.unpublish;

    const runEdit = (kind: ErrorKind, status: 'active' | 'inactive', onSuccess?: () => void) => {
        if (!automation) {
            throw new Error('Cannot edit an automation that has not loaded.');
        }
        setRequestStates(state => ({...state, [kind]: 'loading'}));
        editMutation.mutate(
            {
                id: automation.id,
                status,
                actions: automation.actions,
                edges: automation.edges
            },
            {
                onSuccess: () => {
                    setRequestStates(state => ({...state, [kind]: 'idle'}));
                    onSuccess?.();
                },
                onError: () => {
                    setRequestStates(state => ({...state, [kind]: 'error'}));
                }
            }
        );
    };

    const handlePublish = () => {
        runEdit('publish', 'active');
    };

    const handleTurnOffRequested = () => {
        setRequestStates(state => ({...state, unpublish: 'idle'}));
        setIsConfirmingUnpublish(true);
    };

    const handleConfirmTurnOff = () => {
        runEdit('unpublish', 'inactive', () => setIsConfirmingUnpublish(false));
    };

    const handleConfirmingUnpublishChange = (open: boolean) => {
        if (unpublishState === 'loading') {
            return;
        }
        if (!open) {
            setRequestStates(state => ({...state, unpublish: 'idle'}));
        }
        setIsConfirmingUnpublish(open);
    };

    return (
        <div className='flex h-full w-full flex-col' data-testid='automation-editor'>
            <AutomationHeader
                automation={automation}
                isLoadingAutomation={isLoadingAutomation}
                publishState={publishState}
                unpublishState={unpublishState}
                onPublish={handlePublish}
                onTurnOff={handleTurnOffRequested}
            />

            <AutomationCanvas automation={automation} isError={isError} isLoading={isLoadingAutomation} />

            <AlertDialog open={isConfirmingUnpublish} onOpenChange={handleConfirmingUnpublishChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Turn off this automation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It will stop running until you turn it back on.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={unpublishState === 'loading'}>Cancel</AlertDialogCancel>
                        <Button
                            disabled={unpublishState === 'loading'}
                            variant={unpublishState === 'error' ? 'destructive' : 'default'}
                            onClick={handleConfirmTurnOff}
                        >
                            {unpublishState === 'loading' ? (
                                <>
                                    <LoadingIndicator color='light' size='sm' />
                                    Turning off...
                                </>
                            ) : unpublishState === 'error' ? (
                                'Retry'
                            ) : (
                                'Turn off'
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AutomationEditor;
