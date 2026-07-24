import BrandIcon from '../../../icons/brand-icon';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, Switch} from '@tryghost/shade/components';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingsModal} from '@tryghost/shade/patterns';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const UnsplashModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [unsplashEnabled] = getSettingValues<boolean>(settings, ['unsplash']);
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const [okLabel, setOkLabel] = useState('Save');
    const [enabled, setEnabled] = useState<boolean>(!!unsplashEnabled);

    useEffect(() => {
        setEnabled(unsplashEnabled || false);
    }, [unsplashEnabled]);

    const handleToggleChange = async () => {
        const updates: Setting[] = [
            {key: 'unsplash', value: (enabled)}
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

    const isDirty = !(enabled === unsplashEnabled);

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={isDirty}
            okLabel={okLabel}
            okVariant='default'
            testId='unsplash-modal'
            title=''
            onOk={handleToggleChange}
        >
            <IntegrationHeader
                detail='Beautiful, free photos'
                icon={<BrandIcon name='unsplash' size={48} />}
                title='Unsplash'
            />
            <div className='mt-7'>
                <FieldGroup className='gap-8 rounded-sm border border-border-default p-4 md:p-7'>
                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='unsplash-enabled'>Enable Unsplash</FieldLabel>
                            <FieldDescription>Enable <a className='text-green' href="https://unsplash.com" rel="noopener noreferrer" target="_blank">Unsplash</a> image integration for your posts</FieldDescription>
                        </FieldContent>
                        <Switch checked={enabled} id='unsplash-enabled' onCheckedChange={setEnabled} />
                    </Field>
                </FieldGroup>
            </div>
        </SettingsModal>
    );
});

export default UnsplashModal;
