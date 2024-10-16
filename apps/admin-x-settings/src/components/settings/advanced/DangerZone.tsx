import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, ConfirmationModal, SettingGroupHeader, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useDeleteAllContent} from '@tryghost/admin-x-framework/api/db';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tryghost/admin-x-framework';

const DangerZone: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {mutateAsync: deleteAllContent} = useDeleteAllContent();
    const client = useQueryClient();
    const handleError = useHandleError();

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

    return (
        <TopLevelGroup
            customHeader={
                <SettingGroupHeader description='Permanently delete all posts and tags from the database, a hard reset' title='Danger zone' />
            }
            keywords={keywords}
            navid='dangerzone'
            testId='dangerzone'
        >
            <div>
                <Button color='red' label='Delete all content' onClick={handleDeleteAllContent} />
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DangerZone, 'Danger zone');
