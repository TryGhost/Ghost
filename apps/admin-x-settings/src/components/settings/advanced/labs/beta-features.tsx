import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, {useState} from 'react';
import {Button, FileUpload, List, Select, showToast} from '@tryghost/admin-x-design-system';
import {downloadRedirects, useUploadRedirects} from '@tryghost/admin-x-framework/api/redirects';
import {downloadRoutes, useUploadRoutes} from '@tryghost/admin-x-framework/api/routes';
import {getSettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const IS_AUTOMATIONS_BETA_ACTIVE = true;

const SLUG_SEPARATORS = [
    {
        value: '-',
        label: 'Dashes [-]',
        hint: 'The default mode (e.g. /example-ghost-post/).'
    },
    {
        value: '_',
        label: 'Underscores [_]',
        hint: 'A mode with better readability and clearer distinction (e.g. /example_ghost_post/).'
    },
    {
        value: ' ',
        label: 'Spaces [ ]',
        hint: 'A natural mode, but might look foreign in URL:s (eg. /example ghost post/). Also, many browsers will show spaces as %20 in the URL:s.'
    }
];

const BetaFeatures: React.FC = () => {
    const {settings} = useGlobalData();
    const {mutateAsync: uploadRedirects} = useUploadRedirects();
    const {mutateAsync: uploadRoutes} = useUploadRoutes();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const [redirectsUploading, setRedirectsUploading] = useState<boolean>(false);
    const [routesUploading, setRoutesUploading] = useState<boolean>(false);
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const isAutomationsEnabled = !!labs.automations;
    const slugSeparator = getSettingValue<string>(settings, 'slug_separator') || '-';

    return (
        <List titleSeparator={false}>
            {IS_AUTOMATIONS_BETA_ACTIVE ? (
                <LabItem
                    action={<FeatureToggle
                        confirmation={{
                            title: 'Automations (beta)',
                            prompt: 'This is a one-way street. Once enabled, the automations beta can\'t be turned off. Existing welcome emails will move into your automations automatically.',
                            okLabel: 'Enable',
                            okRunningLabel: 'Enabling...'
                        }}
                        disabled={isAutomationsEnabled}
                        flag="automations"
                        label='Automations (beta)' />}
                    detail={<>Build automated email flows for your members, and get early access to new automation features as they ship. <a className='text-green' href="https://ghost.org/help/automations-beta" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a></>}
                    title='Automations (beta)' />
            ) : null}
            <LabItem
                action={<FeatureToggle flag="superEditors" />}
                detail={<>Allows newly-assigned editors to manage members and comments in addition to regular roles.</>}
                title='Enhanced Editor role (beta)' />
            <LabItem
                action={<FeatureToggle flag="editorExcerpt" />}
                detail={<>Adds the excerpt input below the post title in the editor</>}
                title='Show post excerpt inline' />
            <LabItem
                action={<div className='flex w-full max-w-none min-w-[160px] flex-col items-end gap-3 md:w-2/3 md:max-w-[320px]'>
                    <FeatureToggle flag="unicodeSlugs" />
                    <Select
                        containerClassName='w-full md:flex-1'
                        disabled={!labs.unicodeSlugs}
                        options={SLUG_SEPARATORS}
                        selectedOption={SLUG_SEPARATORS.find(option => option.value === slugSeparator)}
                        onSelect={async (option) => {
                            await editSettings([{
                                key: 'slug_separator',
                                value: option?.value || '-'
                            }]);
                        }}
                    />
                </div>}
                detail={<>Use Unicode letters and numbers in URL slugs instead of transliterating them (e.g /smörgåsbord/ instead of /smorgasbord/), which may add benefits for SEO. You can also select another slug separator to adjust the look of the URL:s.</>}
                title='International slugs' />
            <LabItem
                action={<FeatureToggle flag="additionalPaymentMethods" />}
                detail={<>Enable support for CashApp, iDEAL, Bancontact, and others. <a className='text-green' href="https://ghost.org/help/payment-methods" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a></>}
                title='Additional payment methods' />
            <LabItem
                action={<div className='flex flex-col items-end gap-1'>
                    <FileUpload
                        id='upload-redirects'
                        onUpload={async (file) => {
                            try {
                                setRedirectsUploading(true);
                                await uploadRedirects(file);
                                showToast({
                                    title: 'Redirects uploaded',
                                    type: 'success'
                                });
                            } catch (e) {
                                handleError(e);
                            } finally {
                                setRedirectsUploading(false);
                            }
                        }}
                    >
                        <Button color='grey' label={redirectsUploading ? 'Uploading ...' : 'Upload redirects file'} size='sm' tag='div' />
                    </FileUpload>
                    <Button color='green' label='Download current redirects' link onClick={() => downloadRedirects()} />
                </div>}
                detail={<>Configure redirects for old or moved content, <br /> more info in the <a className='text-green' href="https://ghost.org/tutorials/implementing-redirects/" rel="noopener noreferrer" target="_blank">docs</a></>}
                title='Redirects' />
            <LabItem
                action={<div className='flex flex-col items-end gap-1'>
                    <FileUpload
                        id='upload-routes'
                        onUpload={async (file) => {
                            try {
                                setRoutesUploading(true);
                                await uploadRoutes(file);
                                showToast({
                                    type: 'success',
                                    title: 'Routes uploaded'
                                });
                            } catch (e) {
                                handleError(e);
                            } finally {
                                setRoutesUploading(false);
                            }
                        }}
                    >
                        <Button color='grey' label={routesUploading ? 'Uploading ...' : 'Upload routes file'} size='sm' tag='div' />
                    </FileUpload>
                    <Button color='green' label='Download current routes' link onClick={() => downloadRoutes()} />
                </div>}
                detail='Configure dynamic routing by modifying the routes.yaml file'
                title='Routes' />
        </List>
    );
};

export default BetaFeatures;
