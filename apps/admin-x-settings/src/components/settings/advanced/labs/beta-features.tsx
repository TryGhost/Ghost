import FeatureToggle from './feature-toggle';
import LabItem from './lab-item';
import React, {useState} from 'react';
import {Button, FileUpload, List, showToast} from '@tryghost/admin-x-design-system';
import {downloadRedirects, useUploadRedirects} from '@tryghost/admin-x-framework/api/redirects';
import {downloadRoutes, useUploadRoutes} from '@tryghost/admin-x-framework/api/routes';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const IS_AUTOMATIONS_BETA_ACTIVE = true;

const BetaFeatures: React.FC = () => {
    const {settings} = useGlobalData();
    const {mutateAsync: uploadRedirects} = useUploadRedirects();
    const {mutateAsync: uploadRoutes} = useUploadRoutes();
    const handleError = useHandleError();
    const [redirectsUploading, setRedirectsUploading] = useState<boolean>(false);
    const [routesUploading, setRoutesUploading] = useState<boolean>(false);
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const isAutomationsEnabled = !!labs.automations;

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
