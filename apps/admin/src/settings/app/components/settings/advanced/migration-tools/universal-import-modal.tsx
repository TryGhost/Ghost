import React, {useState} from 'react';
import useFeatureFlag from '@/settings/app/hooks/use-feature-flag';
import {Button, Dropzone} from '@tryghost/shade/components';
import {ExternalLink} from 'lucide-react';
import {Inline} from '@tryghost/shade/primitives';
import {SettingsModal} from '@tryghost/shade/patterns';
import {useConfirmation} from '@/settings/app/components/providers/confirmation-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useImportContent} from '@tryghost/admin-x-framework/api/db';
import {useImportContentCSV} from '@tryghost/admin-x-framework/api/posts';

const UniversalImportModal: React.FC<{onClose: () => void}> = ({onClose}) => {
    const {mutateAsync: importContent} = useImportContent();
    const {mutateAsync: importContentCSV} = useImportContentCSV();
    const csvContentImporter = useFeatureFlag('csvContentImporter');
    const [uploading, setUploading] = useState(false);
    const handleError = useHandleError();
    const {confirm} = useConfirmation();

    const acceptedTypes: React.ComponentProps<typeof Dropzone>['accept'] = csvContentImporter
        ? {'application/json': ['.json'], 'application/zip': ['.zip'], 'text/csv': ['.csv']}
        : {'application/json': ['.json'], 'application/zip': ['.zip']};

    return (
        <SettingsModal
            backDropClick={false}
            footer={
                <Inline align='center' className='w-full p-8' justify='between'>
                    <a className='inline-flex items-center gap-1 text-green transition-colors hover:text-green-400' href="https://docs.ghost.org/migration/ghost" rel='noopener noreferrer' target="_blank">
                        Learn more
                        <ExternalLink aria-hidden='true' className='size-3' />
                    </a>
                    <Button disabled={uploading} type='button' variant='outline' onClick={onClose}>Cancel</Button>
                </Inline>
            }
            okLabel=''
            size='sm'
            testId='universal-import-modal'
            title='Universal import'
            onClose={onClose}
        >
            <div className='py-4'>
                <Dropzone
                    accept={acceptedTypes}
                    inputId="import-file"
                    inputTestId="import-file"
                    onDropAccepted={async ([file]) => {
                        setUploading(true);
                        try {
                            if (csvContentImporter && file.name.toLowerCase().endsWith('.csv')) {
                                await importContentCSV(file);
                            } else {
                                await importContent(file);
                            }
                            onClose();
                            confirm({
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
                    <div className="text-center" data-testid="import-file-description">
                        {uploading ? 'Uploading...' : <>
                        Select any {csvContentImporter ? 'JSON, zip or CSV' : 'JSON or zip'} file that contains <br />posts and settings
                        </>}
                    </div>
                </Dropzone>
            </div>
        </SettingsModal>
    );
};

export default UniversalImportModal;
