import Button from '../../../../admin-x-ds/global/Button';
import FeatureToggle from './FeatureToggle';
import FileUpload from '../../../../admin-x-ds/global/form/FileUpload';
import LabItem from './LabItem';
import List from '../../../../admin-x-ds/global/List';
import React, {useState} from 'react';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import {downloadRedirects, useUploadRedirects} from '../../../../api/redirects';
import {downloadRoutes, useUploadRoutes} from '../../../../api/routes';
import {showToast} from '../../../../admin-x-ds/global/Toast';

const BetaFeatures: React.FC = () => {
    const {updateRoute} = useRouting();
    const {mutateAsync: uploadRedirects} = useUploadRedirects();
    const {mutateAsync: uploadRoutes} = useUploadRoutes();
    const handleError = useHandleError();
    const [redirectsUploading, setRedirectsUploading] = useState(false);
    const [routesUploading, setRoutesUploading] = useState(false);

    return (
        <List titleSeparator={false}>
            <LabItem
                action={<Button color='grey' label='Open' size='sm' onClick={() => updateRoute({isExternal: true, route: 'migrate'})} />}
                detail={<>A <a className='text-green' href="https://ghost.org/help/importing-from-substack/" rel="noopener noreferrer" target="_blank">step-by-step tool</a> to easily import all your content, members and paid subscriptions</>}
                title='Substack migrator' />
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
                                    type: 'success',
                                    message: 'Redirects uploaded successfully'
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
                                    message: 'Routes uploaded successfully'
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
