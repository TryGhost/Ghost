import React, {type ReactNode} from 'react';
import useCustomFonts from '@/settings/hooks/use-custom-fonts';
import {ConfirmationModalContent} from '@/settings/components/confirmation-modal';
import {type InstalledTheme, useActivateTheme} from '@tryghost/admin-x-framework/api/themes';
import {OutcomeBanner, ThemeValidationDetailsDisclosure} from './theme-validation-details';
import {getIssuesFromInstalledTheme} from './theme-validation-issues';
import {getHomepageUrl, useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {toast} from 'sonner';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

export type ThemeInstalledModalProps = {
    title: string
    prompt: ReactNode
    installedTheme: InstalledTheme;
    validationDetailsDefaultOpen?: boolean;
    onActivate?: () => void;
};

const ThemeInstalledModal: React.FC<ThemeInstalledModalProps & {onClose: () => void}> = ({title, installedTheme, validationDetailsDefaultOpen, onActivate, onClose}) => {
    const {mutateAsync: activateTheme} = useActivateTheme();
    const {refreshActiveThemeData} = useCustomFonts();
    const handleError = useHandleError();
    const {data: configData} = useBrowseConfig();
    const {data: siteData} = useBrowseSite();
    const defaultOpen = validationDetailsDefaultOpen ?? configData?.config?.environment === 'development';
    const secondaryProblems = getIssuesFromInstalledTheme(installedTheme);
    const homepageUrl = siteData?.site ? getHomepageUrl(siteData.site) : undefined;

    let okLabel = 'Activate theme';

    if (installedTheme.active) {
        okLabel = 'OK';
    }

    const modalTitle = installedTheme.active ? <span className='text-green'>It&apos;s live!</span> : title;
    const outcomeTitle = 'Uploaded successfully';
    const outcomeCopy = installedTheme.active ? (
        <>
            Your theme <strong>{installedTheme.name}</strong> was saved successfully and is now visible to your readers.
            {homepageUrl ? <>
                {' '}<a className='font-semibold text-black hover:underline dark:text-white' href={homepageUrl} rel='noreferrer' target='_blank'>Take a look →</a>
            </> : null}
        </>
    ) : (
        <>
            <strong>{installedTheme.name}</strong> has been uploaded. Activate it to make it live.
        </>
    );

    return <ConfirmationModalContent
        cancelLabel='Close'
        okLabel={okLabel}
        okRunningLabel='Activating...'
        okVariant='default'
        prompt={<>
            <div className='space-y-5'>
                {installedTheme.active ? (
                    <div className='space-y-2 text-sm text-foreground'>
                        <p>{outcomeCopy}</p>
                    </div>
                ) : (
                    <OutcomeBanner title={outcomeTitle} variant='success'>
                        <div className='space-y-2'>
                            <p>{outcomeCopy}</p>
                        </div>
                    </OutcomeBanner>
                )}

                <ThemeValidationDetailsDisclosure
                    defaultOpen={defaultOpen}
                    problems={secondaryProblems}
                />
            </div>
        </>}
        stickyFooter={true}
        title={modalTitle}
        onOk={async (activateModal) => {
            if (!installedTheme.active) {
                try {
                    const resData = await activateTheme(installedTheme.name);
                    const updatedTheme = resData.themes[0];
                    refreshActiveThemeData();

                    toast.success('Theme activated', {description: <div><span className='capitalize'>{updatedTheme.name}</span> is now your active theme.</div>});
                } catch (e) {
                    handleError(e);
                    return;
                }
            }
            onActivate?.();
            activateModal?.remove();
        }}
        onRemove={onClose}
    />;
};

export default ThemeInstalledModal;
