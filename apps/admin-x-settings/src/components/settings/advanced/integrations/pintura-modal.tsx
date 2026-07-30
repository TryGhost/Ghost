import BrandIcon from '../../../icons/brand-icon';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import pinturaScreenshot from '../../../../assets/images/pintura-screenshot.png';
import {Dropzone, Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, Switch} from '@tryghost/shade/components';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingsModal} from '@tryghost/shade/patterns';
import {toast} from 'sonner';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useUploadFile} from '@tryghost/admin-x-framework/api/files';

const PinturaModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const [uploadingState, setUploadingState] = useState({
        js: false,
        css: false
    });

    const {settings, config} = useGlobalData();
    const [pinturaEnabled] = getSettingValues<boolean>(settings, ['pintura']);
    const {mutateAsync: editSettings} = useEditSettings();
    const {mutateAsync: uploadFile} = useUploadFile();
    const handleError = useHandleError();

    useEffect(() => {
        setEnabled(pinturaEnabled || false);
    }, [pinturaEnabled]);

    const [okLabel, setOkLabel] = useState('Save');
    const [enabled, setEnabled] = useState<boolean>(!!pinturaEnabled);

    const handleToggleChange = async () => {
        const updates: Setting[] = [
            {key: 'pintura', value: (enabled)}
        ];
        try {
            setOkLabel('Saving...');
            await Promise.all([
                editSettings(updates),
                new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                })
            ]);
            setOkLabel('Saved');
        } catch (error) {
            handleError(error);
        } finally {
            setTimeout(() => setOkLabel('Save'), 1000);
        }
    };

    const handleUpload = async (file: File, form: 'js' | 'css') => {
        try {
            setUploadingState(prev => ({...prev, [form]: true}));

            const {files} = await uploadFile({file});
            const url = files[0].url;
            const updates : Setting[] = [
                {key: `pintura_${form}_url`, value: url}
            ];

            await editSettings(updates);

            toast.success(`Pintura ${form} uploaded`);
        } catch (e) {
            handleError(e);
        } finally {
            setUploadingState(prev => ({...prev, [form]: false}));
        }
    };

    const isDirty = !(enabled === pinturaEnabled);

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={isDirty}
            okLabel={okLabel}
            okVariant='default'
            testId='pintura-modal'
            title=''
            onOk={handleToggleChange}
        >
            <IntegrationHeader
                detail='Advanced image editing'
                icon={<BrandIcon name='pintura' size={48} />}
                title='Pintura'
            />
            <div className='mt-7'>
                {!config.pintura && <div className='mb-7 flex flex-col items-stretch justify-between gap-4 rounded-sm bg-grey-50 p-4 md:flex-row md:p-7 dark:bg-grey-950'>
                    <div className='md:basis-1/2'>
                        <p className='mb-4 text-md font-semibold'>Add advanced image editing to Ghost, with Pintura</p>
                        <p className='mb-4'>Pintura is a powerful JavaScript image editor that allows you to crop, rotate, annotate and modify images directly inside Ghost.</p>
                        <p>Try a demo, purchase a license, and download the required CSS/JS files from pqina.nl/pintura/ to activate this feature.</p>
                    </div>
                    <div className='flex grow flex-col items-end justify-between gap-2 md:basis-1/2'>
                        <img alt='Pintura screenshot' src={pinturaScreenshot} />
                        <a className='-mb-1 font-medium text-green' href="https://pqina.nl/pintura/ghost/?ref=ghost.org" rel="noopener noreferrer" target="_blank">Find out more &rarr;</a>
                    </div>
                </div>}

                <FieldSet className='gap-0'>
                    <FieldLegend className='mb-3 text-md! leading-supertight font-bold md:text-lg!'>Pintura configuration</FieldLegend>
                    <FieldGroup className='gap-8 rounded-sm border border-border-default p-4 md:p-7'>
                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='pintura-enabled'>Enable Pintura</FieldLabel>
                            <FieldDescription>Enable <a className='text-green' href="https://pqina.nl/pintura/ghost/?ref=ghost.org" rel="noopener noreferrer" target="_blank">Pintura</a> for editing your images in Ghost</FieldDescription>
                        </FieldContent>
                        <Switch checked={enabled} id='pintura-enabled' onCheckedChange={setEnabled} />
                    </Field>
                    {enabled && !config.pintura && (
                        <>
                            <div className='flex flex-col justify-between gap-1 md:flex-row md:items-center'>
                                <div>
                                    <div>Upload Pintura script</div>
                                    <div className='text-sm text-grey-600'>Upload the <code>pintura-umd.js</code> file from the Pintura package</div>
                                </div>
                                <Dropzone accept={{'text/javascript': ['.js'], 'application/javascript': ['.js']}} disabled={uploadingState.js} variant='button' onDropAccepted={files => handleUpload(files[0], 'js')}>
                                    {uploadingState.js ? 'Uploading...' : 'Upload'}
                                </Dropzone>
                            </div>
                            <div className='flex flex-col justify-between gap-1 md:flex-row md:items-center'>
                                <div>
                                    <div>Upload Pintura styles</div>
                                    <div className='text-sm text-grey-600'>Upload the <code>pintura.css</code> file from the Pintura package</div>
                                </div>
                                <Dropzone accept={{'text/css': ['.css']}} disabled={uploadingState.css} variant='button' onDropAccepted={files => handleUpload(files[0], 'css')}>
                                    {uploadingState.css ? 'Uploading...' : 'Upload'}
                                </Dropzone>
                            </div>
                        </>
                    )}
                    </FieldGroup>
                </FieldSet>
            </div>
        </SettingsModal>
    );
});

export default PinturaModal;
