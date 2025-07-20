import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import React, {useEffect, useState} from 'react';
import {Button, FileUpload, List, showToast} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {downloadRedirects, useUploadRedirects} from '@tryghost/admin-x-framework/api/redirects';
import {downloadRoutes, useUploadRoutes} from '@tryghost/admin-x-framework/api/routes';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const BetaFeatures: React.FC = () => {
    const limiter = useLimiter();
    const {mutateAsync: uploadRedirects} = useUploadRedirects();
    const {mutateAsync: uploadRoutes} = useUploadRoutes();
    const handleError = useHandleError();
    const [redirectsUploading, setRedirectsUploading] = useState<boolean>(false);
    const [routesUploading, setRoutesUploading] = useState<boolean>(false);
    const [limitSocialWeb, setLimitSocialWeb] = useState<boolean>(false);
    const [socialWebLimitMessage, setSocialWebLimitMessage] = useState<string>('Please setup a custom domain to enable.');
    const {config} = useGlobalData();
    const isPro = !!config.hostSettings?.siteId;

    useEffect(() => {
        if (limiter?.isLimited('limitSocialWeb')) {
            limiter.errorIfWouldGoOverLimit('limitSocialWeb').catch((error) => {
                if (error instanceof HostLimitError) {
                    const {subdir} = getGhostPaths();
                    // ensure subdir is defined and not empty
                    const hasSubdir = subdir?.length > 0;

                    const socialWebNotAvailableMsg = hasSubdir ?
                        'Not compatible with /subdirectory installations.' :
                        'Please setup a custom domain to enable.';

                    setSocialWebLimitMessage(socialWebNotAvailableMsg);
                    setLimitSocialWeb(true);
                } else {
                    handleError(error);
                }
            });
        }
    }, [limiter, handleError]);

    return (
        <List titleSeparator={false}>
            {isPro && (
                <LabItem
                    action={<FeatureToggle disabled={limitSocialWeb} flag="ActivityPub"/>}
                    detail={
                        <>
                        Federate your site with ActivityPub to join the world&apos;s largest open network.
                            {limitSocialWeb &&
                                (<><br></br>{socialWebLimitMessage} </>)
                            }
                            &nbsp;
                            <a className='text-green' href="https://ghost.org/help/social-web/" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a>
                        </>
                    }
                    title='Social web (beta)' />
            )}
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
