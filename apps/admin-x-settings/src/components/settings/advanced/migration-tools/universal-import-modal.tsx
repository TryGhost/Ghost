import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {ConfirmationModal, FileUpload, Modal} from '@tryghost/admin-x-design-system';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useImportContent} from '@tryghost/admin-x-framework/api/db';

const UniversalImportModal: React.FC = () => {
    const modal = useModal();
    const {mutateAsync: importContent} = useImportContent();
    const [uploading, setUploading] = useState(false);
    const handleError = useHandleError();

    return (
        <Modal
            backDropClick={false}
            okLabel=''
            size='sm'
            testId='universal-import-modal'
            title='Universal import'
        >
            <div className='py-4 leading-9'>
                <FileUpload
                    accept="application/json, application/zip"
                    id="import-file"
                    onUpload={async (file) => {
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
                    <div className="-mb-4 cursor-pointer bg-grey-75 p-10 text-center dark:bg-grey-950">
                        {uploading ? 'Uploading...' : <>
                        Select any JSON or zip file that contains <br />posts and settings
                        </>}
                    </div>
                </FileUpload>
            </div>
        </Modal>
    );
};

export default NiceModal.create(UniversalImportModal);
