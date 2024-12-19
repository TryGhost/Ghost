import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React, {useState} from 'react';
import {Button, FileUpload, List, showToast} from '@tryghost/admin-x-design-system';
import {downloadRedirects, useUploadRedirects} from '@tryghost/admin-x-framework/api/redirects';
import {downloadRoutes, useUploadRoutes} from '@tryghost/admin-x-framework/api/routes';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const BetaFeatures: React.FC = () => {
    const {mutateAsync: uploadRedirects} = useUploadRedirects();
    const {mutateAsync: uploadRoutes} = useUploadRoutes();
    const handleError = useHandleError();
    const [redirectsUploading, setRedirectsUploading] = useState(false);
    const [routesUploading, setRoutesUploading] = useState(false);

    return (
        <List titleSeparator={false}>
            <LabItem
                action={<FeatureToggle flag="editorExcerpt" />}
                detail={<>Adds the excerpt input below the post title in the editor</>}
                title='Show post excerpt inline' />
            <LabItem
                action={<FeatureToggle flag="additionalPaymentMethods" />}
                detail={<>Enable support for CashApp, iDEAL, Bancontact, and others. <a className='text-green' href="https://ghost.org/help/payment-methods" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a></>}
                title='Additional payment methods' />
            <LabItem
                action={<FeatureToggle flag='i18n' />}
                detail={<>Translate your membership flows into your publication language (<a className='text-green' href="https://github.com/TryGhost/Ghost/tree/main/ghost/i18n/locales" rel="noopener noreferrer" target="_blank">supported languages</a>). Don’t see yours? <a className='text-green' href="https://forum.ghost.org/t/help-translate-ghost-beta/37461" rel="noopener noreferrer" target="_blank">Get involved</a></>}
                title='Portal translation' />
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
