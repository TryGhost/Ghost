import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import trackEvent from '../../../utils/analytics';
import useStaffUsers from '../../../hooks/use-staff-users';
import {Button, ConfirmationModal, ListItem, SettingGroupHeader, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useDeleteAllContent} from '@tryghost/admin-x-framework/api/db';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tryghost/admin-x-framework';
import {useRemoveAllGiftLinks} from '@tryghost/admin-x-framework/api/gift-links';
import {useResetAuth} from '@tryghost/admin-x-framework/api/security';

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
            okColor: 'red',
            okLabel: 'Delete',
            onOk: async (modal) => {
                try {
                    await deleteAllContent(null);
                    showToast({
                        title: 'All content deleted from database.',
                        type: 'success'
                    });
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
            okColor: 'red',
            onOk: async (modal) => {
                try {
                    const response = await resetAuth(null);
                    const result = response?.security_action?.[0];
                    const keys = result?.api_keys_rotated ?? 0;
                    const users = result?.users_locked ?? 0;
                    showToast({
                        title: `Rotated ${keys} API ${keys === 1 ? 'key' : 'keys'} and locked ${users} ${users === 1 ? 'user' : 'users'}. You will be signed out shortly.`,
                        type: 'success'
                    });
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
            okColor: 'red',
            onOk: async (modal) => {
                try {
                    const response = await removeAllGiftLinks(null);
                    const count = response?.meta?.count ?? 0;
                    trackEvent('All Gift Links Reset');
                    showToast({
                        title: `Reset ${count} gift ${count === 1 ? 'link' : 'links'}.`,
                        type: 'success'
                    });
                    modal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return (
        <TopLevelGroup
            customHeader={
                <SettingGroupHeader description='Destructive actions that affect your entire site.' title='Danger zone' />
            }
            keywords={keywords}
            navid='dangerzone'
            testId='dangerzone'
        >
            <div className='flex flex-col'>
                <ListItem
                    action={<Button aria-label='Delete all content' color='red' label='Delete' onClick={handleDeleteAllContent} />}
                    bgOnHover={false}
                    detail='Permanently delete all posts and tags from the database.'
                    testId='delete-all-content'
                    title='Delete all content'
                />
                {resetAuthEnabled && (
                    <ListItem
                        action={<Button aria-label='Reset all authentication' color='red' label='Reset' onClick={handleResetAuth} />}
                        bgOnHover={false}
                        detail='Rotate every API key, sign out every staff user, and require a password reset. Use after a suspected credential compromise.'
                        testId='reset-all-authentication'
                        title='Reset all authentication'
                    />
                )}
                <ListItem
                    action={<Button aria-label='Reset all gift links' color='red' label='Reset' onClick={handleRemoveAllGiftLinks} />}
                    bgOnHover={false}
                    detail='Invalidate every active gift link across your site. Anyone holding one will lose access.'
                    testId='reset-all-gift-links'
                    title='Reset all gift links'
                />
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DangerZone, 'Danger zone');
