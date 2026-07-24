import ConfirmationModal from '../../../confirmation-modal';
import LabItem from './lab-item';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {ActionList, Button, Dropzone} from '@tryghost/shade/components';
import {downloadAllContent, useDeleteAllContent, useImportContent} from '@tryghost/admin-x-framework/api/db';
import {toast} from 'sonner';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tanstack/react-query';

const ImportModalContent = () => {
    const modal = useModal();
    const {mutateAsync: importContent} = useImportContent();
    const [uploading, setUploading] = useState(false);
    const handleError = useHandleError();

    return <Dropzone
        accept={{'application/json': ['.json'], 'application/zip': ['.zip']}}
        inputId="import-file"
        onDropAccepted={async ([file]) => {
            setUploading(true);
            try {
                await importContent(file);
                modal.remove();
                NiceModal.show(ConfirmationModal, {
                    title: 'Import in progress',
                    prompt: `Your import is being processed, and you'll receive a confirmation email as soon as it’s complete. Usually this only takes a few minutes, but larger imports may take longer.`,
                    cancelLabel: '',
                    okLabel: 'Got it',
                    onOk: confirmModal => confirmModal?.remove(),
                    formSheet: false
                });
            } catch (e) {
                handleError(e);
            } finally {
                setUploading(false);
            }
        }}
    >
        <div className="text-center">
            {uploading ? 'Uploading ...' : 'Select a JSON or zip file'}
        </div>
    </Dropzone>;
};

const MigrationOptions: React.FC = () => {
    const {mutateAsync: deleteAllContent} = useDeleteAllContent();
    const client = useQueryClient();
    const handleError = useHandleError();

    const handleImportContent = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Import content',
            prompt: <ImportModalContent />,
            okLabel: '',
            formSheet: false
        });
    };

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

    return (
        <ActionList>
            <LabItem
                action={<Button size='sm' type='button' variant='secondary' onClick={handleImportContent}>Open importer</Button>}
                detail='Import posts from a JSON or zip file'
                title='Import content' />
            <LabItem
                action={<Button size='sm' type='button' variant='secondary' onClick={() => downloadAllContent()}>Export</Button>}
                detail='Download all of your posts and settings in a single, glorious JSON file'
                title='Export your content' />
            <LabItem
                action={<Button size='sm' type='button' variant='destructive' onClick={handleDeleteAllContent}>Delete</Button>}
                detail='Permanently delete all posts and tags from the database, a hard reset'
                title='Delete all content' />
        </ActionList>
    );
};

export default MigrationOptions;
