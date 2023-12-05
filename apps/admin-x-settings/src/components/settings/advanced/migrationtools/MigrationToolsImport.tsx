import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Button, ConfirmationModal, FileUpload} from '@tryghost/admin-x-design-system';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useImportContent} from '@tryghost/admin-x-framework/api/db';

const ImportModalContent = () => {
    const modal = useModal();
    const {mutateAsync: importContent} = useImportContent();
    const [uploading, setUploading] = useState(false);
    const handleError = useHandleError();

    return <FileUpload
        id="import-file"
        onUpload={async (file) => {
            setUploading(true);
            try {
                await importContent(file);
                modal.remove();
                NiceModal.show(ConfirmationModal, {
                    title: 'Import in progress',
                    prompt: `Your import is being processed, and you'll receive a confirmation email as soon as it's complete. Usually this only takes a few minutes, but larger imports may take longer.`,
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
        <div className="cursor-pointer bg-grey-75 p-10 text-center dark:bg-grey-950">
            {uploading ? 'Uploading ...' : 'Select a JSON or zip file'}
        </div>
    </FileUpload>;
};

const MigrationToolsImport: React.FC = () => {
    const handleImportContent = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Import content',
            prompt: <ImportModalContent />,
            okLabel: '',
            formSheet: false
        });
    };

    return (
        <Button color='grey' label='Open importer' size='sm' onClick={handleImportContent} />
    );
};

export default MigrationToolsImport;
