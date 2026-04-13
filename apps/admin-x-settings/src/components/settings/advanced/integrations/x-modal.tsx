import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {Button, ConfirmationModal, Icon, Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {getSettingValues, useDeleteXSettings, useVerifyXSettings} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const XModal: React.FC<RoutingModalProps> = ({searchParams}) => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const handleError = useHandleError();
    const {mutateAsync: deleteXSettings} = useDeleteXSettings();
    const {mutateAsync: verifyXSettings, isPending: isVerifyingXSettings} = useVerifyXSettings();
    const {apiRoot} = getGhostPaths();
    const [xAccessToken, xUsername] = getSettingValues<string>(settings, ['x_access_token', 'x_username']);
    const isConnected = Boolean(xAccessToken && xUsername);
    const errorMessage = searchParams?.get('error');
    const [isAwaitingVerifier, setIsAwaitingVerifier] = useState(false);
    const [oauthVerifier, setOauthVerifier] = useState('');
    const [verifierError, setVerifierError] = useState<string | null>(null);

    useEffect(() => {
        if (isConnected) {
            setIsAwaitingVerifier(false);
            setOauthVerifier('');
            setVerifierError(null);
        }
    }, [isConnected]);

    const closeModal = () => {
        updateRoute('integrations');
        modal.remove();
    };

    const openXAuthorization = () => {
        setVerifierError(null);
        setIsAwaitingVerifier(true);
        window.open(`${apiRoot}/x/`, '_blank', 'noopener,noreferrer');
    };

    const submitVerifier = async () => {
        const trimmedVerifier = oauthVerifier.trim();

        if (!trimmedVerifier) {
            setVerifierError('Please enter the verification code from X.');
            return;
        }

        try {
            setVerifierError(null);
            await verifyXSettings({oauthVerifier: trimmedVerifier});
            showToast({
                title: 'X connected',
                type: 'success'
            });
        } catch (error) {
            if (error instanceof JSONError && error.data?.errors?.[0]?.message) {
                setVerifierError(error.data.errors[0].message);
                return;
            }

            handleError(error);
        }
    };

    const openDisconnectModal = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Disconnect X',
            prompt: 'You are about to disconnect your X account from Ghost. New posts will stop publishing to X until you reconnect it.',
            okColor: 'red',
            okLabel: 'Disconnect',
            onOk: async (confirmModal) => {
                try {
                    await deleteXSettings(null);
                    confirmModal?.remove();
                    closeModal();
                } catch (error) {
                    handleError(error);
                }
            }
        });
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel=''
            footer={
                <div className='mx-8 flex w-full items-center justify-between'>
                    <Button
                        color='outline'
                        href='https://developer.x.com/en/docs/x-api/posts/manage-tweets/introduction'
                        label={<span className='flex items-center gap-1'>Open docs <Icon name='arrow-top-right' size='xs' /></span>}
                        rel='noopener noreferrer'
                        tag='a'
                        target='_blank'
                    />
                    {isConnected ? (
                        <div className='flex items-center gap-3'>
                            <Button color='red' label='Disconnect' onClick={openDisconnectModal} />
                            <Button color='black' label='Close' onClick={closeModal} />
                        </div>
                    ) : isAwaitingVerifier ? (
                        <div className='flex items-center gap-3'>
                            <Button color='outline' label='Close' onClick={closeModal} />
                            <Button color='black' disabled={isVerifyingXSettings} label={isVerifyingXSettings ? 'Verifying…' : 'Verify code'} onClick={submitVerifier} />
                        </div>
                    ) : (
                        <Button
                            color='black'
                            label='Connect with X'
                            onClick={openXAuthorization}
                        />
                    )}
                </div>
            }
            stickyFooter
            testId='x-modal'
            title=''
        >
            <IntegrationHeader
                detail={isConnected ? 'Automatically publish newly published posts to your X audience.' : 'Connect your publication to X to automatically post newly published articles.'}
                icon={<Icon name='twitter-x' size={56} />}
                title='X'
            />
            <div className='mt-7 flex flex-col gap-4'>
                {errorMessage && <div className='rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100'>{errorMessage}</div>}
                {isConnected ? (
                    <>
                        <p className='text-sm text-grey-700 dark:text-grey-300'>Ghost will publish each newly published post to the connected X profile unless you disable it in the post settings before publishing.</p>
                        <div className='rounded border border-grey-200 bg-grey-50 px-4 py-3 dark:border-grey-900 dark:bg-grey-950'>
                            <div className='text-xs font-semibold tracking-wide text-grey-700 uppercase dark:text-grey-400'>Connected account</div>
                            <div className='mt-1 text-base font-semibold'>{xUsername}</div>
                        </div>
                    </>
                ) : isAwaitingVerifier ? (
                    <>
                        <div className='rounded border border-grey-200 bg-grey-50 px-4 py-3 text-sm text-grey-900 dark:border-grey-900 dark:bg-grey-950 dark:text-grey-100'>
                            A new X authorization tab has been opened. Approve access there, then paste the verification code that X shows you.
                        </div>
                        <TextField
                            error={Boolean(verifierError)}
                            hint={verifierError || 'Paste the verification code from X to finish connecting Ghost.'}
                            title='Verification code'
                            value={oauthVerifier}
                            onChange={event => setOauthVerifier(event.target.value)}
                        />
                        <div>
                            <Button color='outline' label='Open X again' onClick={openXAuthorization} />
                        </div>
                    </>
                ) : (
                    <p className='text-sm text-grey-700 dark:text-grey-300'>Use the X OAuth flow to connect your account. Ghost will open X in a new tab, then you can paste the verification code here to finish setup. Once connected, Ghost will post a link to each newly published article and you can opt out per post from the editor.</p>
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(XModal);
