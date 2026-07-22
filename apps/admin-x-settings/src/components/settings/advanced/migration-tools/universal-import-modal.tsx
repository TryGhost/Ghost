import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Button, ConfirmationModal, Modal} from '@tryghost/admin-x-design-system';
import {Dropzone} from '@tryghost/shade/components';
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
            footer={
                <div className='flex w-full items-center justify-between p-8'>
                    <a className='text-green hover:text-green-400' href="https://docs.ghost.org/migration/ghost" rel='noopener noreferrer' target="_blank">Learn about importing</a>
                    <Button color='outline' disabled={uploading} label='Cancel' onClick={() => modal.remove()} />
                </div>
            }
            okLabel=''
            size='sm'
            testId='universal-import-modal'
            title='Universal import'
        >
            <div className='py-4'>
                <Dropzone
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
                        {uploading ? 'Uploading...' : <>
                        Select any JSON or zip file that contains <br />posts and settings
                        </>}
                    </div>
                </Dropzone>
            </div>
        </Modal>
    );
};

export default NiceModal.create(UniversalImportModal);
