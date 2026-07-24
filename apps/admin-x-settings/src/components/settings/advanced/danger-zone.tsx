import ConfirmationModal from '../../confirmation-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import trackEvent from '../../../utils/analytics';
import useStaffUsers from '../../../hooks/use-staff-users';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {toast} from 'sonner';
import {useDeleteAllContent} from '@tryghost/admin-x-framework/api/db';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tryghost/admin-x-framework';
import {useRemoveAllGiftLinks} from '@tryghost/admin-x-framework/api/gift-links';
import {useResetAuth} from '@tryghost/admin-x-framework/api/security';
import {withErrorBoundary} from '../../error-boundary';

const DangerZone: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {mutateAsync: deleteAllContent} = useDeleteAllContent();
    const {mutateAsync: resetAuth} = useResetAuth();
    const {mutateAsync: removeAllGiftLinks} = useRemoveAllGiftLinks();
    const client = useQueryClient();
    const handleError = useHandleError();
    const {config} = useGlobalData();
    const {totalUsers} = useStaffUsers();

    const resetAuthEnabled = Boolean(config?.labs?.dangerZoneResetAuth);

    const resetAuthStaffSentence = totalUsers === 1
        ? 'You will be signed out and must reset your password before signing back in.'
        : totalUsers > 1
            ? `All ${totalUsers} staff users, including you, will be signed out and must reset their password before signing back in.`
            : 'All staff users, including you, will be signed out and must reset their password before signing back in.';

    const handleDeleteAllContent = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Would you really like to delete all content from your blog?',
            prompt: 'This is permanent! No backups, no restores, no magic undo button. We warned you, k?',
            okVariant: 'destructive',
            okLabel: 'Delete',
            onOk: async (modal) => {
                try {
                    await deleteAllContent(null);
                    toast.success('All content deleted from database.');
                    modal?.remove();
                    await client.refetchQueries();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    const handleResetAuth = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Reset all authentication?',
            prompt: (
                <>
                    <p className='mb-4'>
                        This rotates every API key on your site. Any integration using one will stop working until you reconfigure it with the new key from <strong>Settings → Advanced → Integrations</strong>.
                    </p>
                    <p>
                        {resetAuthStaffSentence} Your members aren&apos;t affected.
                    </p>
                </>
            ),
            okLabel: 'Reset all authentication',
            okRunningLabel: 'Resetting...',
            okVariant: 'destructive',
            onOk: async (modal) => {
                try {
                    const response = await resetAuth(null);
                    const result = response?.security_action?.[0];
                    const keys = result?.api_keys_rotated ?? 0;
                    const users = result?.users_locked ?? 0;
                    toast.success(`Rotated ${formatNumber(keys)} API ${keys === 1 ? 'key' : 'keys'} and locked ${formatNumber(users)} ${users === 1 ? 'user' : 'users'}. You will be signed out shortly.`);
                    modal?.remove();
                    window.location.href = getGhostPaths().adminRoot;
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    const handleRemoveAllGiftLinks = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Reset all gift links?',
            prompt: 'This immediately invalidates every active gift link across your site. Anyone holding one will lose access. New gift links can still be created afterwards.',
            okLabel: 'Reset all gift links',
            okRunningLabel: 'Resetting...',
            okVariant: 'destructive',
            onOk: async (modal) => {
                try {
                    const response = await removeAllGiftLinks(null);
                    const count = response?.meta?.count ?? 0;
                    trackEvent('All Gift Links Reset');
                    toast.success(`Reset ${formatNumber(count)} gift ${count === 1 ? 'link' : 'links'}.`);
                    modal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return (
        <TopLevelGroup
            description='Destructive actions that affect your entire site.'
            keywords={keywords}
            navid='dangerzone'
            testId='dangerzone'
            title='Danger zone'
        >
            <ActionList>
                <ActionListItem data-testid='delete-all-content' hover={false}>
                    <ActionListItemContent className='py-3 pr-6'>
                        <div>Delete all content</div>
                        <div className='text-sm text-muted-foreground'>Permanently delete all posts and tags from the database.</div>
                    </ActionListItemContent>
                    <ActionListItemActions><Button aria-label='Delete all content' size='sm' type='button' variant='destructive' onClick={handleDeleteAllContent}>Delete</Button></ActionListItemActions>
                </ActionListItem>
                {resetAuthEnabled && (
                    <ActionListItem data-testid='reset-all-authentication' hover={false}>
                        <ActionListItemContent className='py-3 pr-6'>
                            <div>Reset all authentication</div>
                            <div className='text-sm text-muted-foreground'>Rotate every API key, sign out every staff user, and require a password reset. Use after a suspected credential compromise.</div>
                        </ActionListItemContent>
                        <ActionListItemActions><Button aria-label='Reset all authentication' size='sm' type='button' variant='destructive' onClick={handleResetAuth}>Reset</Button></ActionListItemActions>
                    </ActionListItem>
                )}
                <ActionListItem data-testid='reset-all-gift-links' hover={false}>
                    <ActionListItemContent className='py-3 pr-6'>
                        <div>Reset all gift links</div>
                        <div className='text-sm text-muted-foreground'>Invalidate every active gift link across your site. Anyone holding one will lose access.</div>
                    </ActionListItemContent>
                    <ActionListItemActions><Button aria-label='Reset all gift links' size='sm' type='button' variant='destructive' onClick={handleRemoveAllGiftLinks}>Reset</Button></ActionListItemActions>
                </ActionListItem>
            </ActionList>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DangerZone, 'Danger zone');
