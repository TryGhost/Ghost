import AddStepModal from '../add-step-modal';
import NiceModal from '@ebay/nice-modal-react';
import WelcomeEmailModal from '../welcome-email-modal';
import {computeContainerHeight, computeLayout} from './flow-layout';
import {showToast} from '@tryghost/admin-x-design-system';
import {useCallback, useMemo} from 'react';
import {useDeleteAutomatedEmail, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import type {Node, NodeMouseHandler} from '@xyflow/react';

export function useCampaignFlow(campaignType: string, emails: AutomatedEmail[]) {
    const {mutateAsync: deleteAutomatedEmail} = useDeleteAutomatedEmail();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const steps = useMemo(() => emails
        .filter(e => e.campaign_type === campaignType)
        .sort((a, b) => a.sort_order - b.sort_order),
    [emails, campaignType]);

    const nextSortOrder = useMemo(() => {
        if (steps.length > 0) {
            return Math.max(...steps.map(s => s.sort_order)) + 1;
        }
        return 0;
    }, [steps]);

    const handleEdit = useCallback((step: AutomatedEmail) => {
        NiceModal.show(WelcomeEmailModal, {
            emailType: campaignType === 'paid_signup' ? 'paid' : 'free',
            automatedEmail: step
        });
    }, [campaignType]);

    const handleDelete = useCallback(async (step: AutomatedEmail) => {
        try {
            await deleteAutomatedEmail(step.id);
            showToast({type: 'success', title: 'Campaign step deleted'});
        } catch (e) {
            handleError(e);
        }
    }, [deleteAutomatedEmail, handleError]);

    const handleEditDelay = useCallback(async (step: AutomatedEmail, newDelay: number) => {
        try {
            await editAutomatedEmail({...step, delay_days: newDelay});
        } catch (e) {
            handleError(e);
        }
    }, [editAutomatedEmail, handleError]);

    const handleEditDelayById = useCallback(async (stepId: string, newDelay: number) => {
        const step = steps.find(s => s.id === stepId);
        if (!step) {
            return;
        }
        try {
            await editAutomatedEmail({...step, delay_days: newDelay});
        } catch (e) {
            handleError(e);
        }
    }, [steps, editAutomatedEmail, handleError]);

    const handleAdd = useCallback(() => {
        NiceModal.show(AddStepModal, {campaignType, nextSortOrder});
    }, [campaignType, nextSortOrder]);

    const {nodes, edges} = useMemo(() => computeLayout(steps, campaignType, {
        onEdit: handleEdit,
        onDelete: handleDelete,
        onEditDelay: handleEditDelay,
        onEditDelayById: handleEditDelayById,
        onAdd: handleAdd
    }),
    [steps, campaignType, handleEdit, handleDelete, handleEditDelay, handleEditDelayById, handleAdd]);

    const onNodeDragStop: NodeMouseHandler = useCallback(async (_event, draggedNode) => {
        if (!draggedNode.id.startsWith('step-')) {
            return;
        }

        const draggedY = draggedNode.position.y;

        // Find the step nodes sorted by their current y position after drag
        const stepNodes = nodes
            .filter(n => n.id.startsWith('step-'))
            .map(n => ({
                ...n,
                y: n.id === draggedNode.id ? draggedY : n.position.y
            }))
            .sort((a, b) => a.y - b.y);

        const newOrder = stepNodes.map(n => n.id.replace('step-', ''));
        const currentOrder = steps.map(s => s.id);

        // Only update if order changed
        if (JSON.stringify(newOrder) === JSON.stringify(currentOrder)) {
            return;
        }

        try {
            await Promise.all(
                newOrder.map((id, index) => {
                    const step = steps.find(s => s.id === id);
                    if (step && step.sort_order !== index) {
                        return editAutomatedEmail({...step, sort_order: index});
                    }
                    return Promise.resolve();
                })
            );
            showToast({type: 'success', title: 'Step order updated'});
        } catch (e) {
            handleError(e);
        }
    }, [nodes, steps, editAutomatedEmail, handleError]);

    const onNodeDrag = useCallback((_event: React.MouseEvent, node: Node) => {
        // Constrain drag to vertical only by resetting x
        if (node.id.startsWith('step-')) {
            node.position.x = 0;
        }
    }, []);

    const containerHeight = computeContainerHeight(steps.length);

    return {
        nodes,
        edges,
        onNodeDragStop,
        onNodeDrag,
        containerHeight
    };
}
