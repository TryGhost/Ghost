import React, {useState} from 'react';
import {Button} from '@tryghost/shade/components';
import {WelcomeEmailCustomizeModalContent} from '@tryghost/admin-x-settings/welcome-email-customize-modal';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

const EmailDesignButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();

    const isLoading = settings.isLoading || site.isLoading || config.isLoading;
    const isError = settings.isError || site.isError || config.isError;

    const handleClick = () => {
        if (!settings.data || !site.data || !config.data) {
            return;
        }

        setIsOpen(true);
    };

    return (
        <>
            <Button disabled={isLoading || isError} variant='outline' onClick={handleClick}>
                Email design
            </Button>
            {settings.data && site.data && config.data ? (
                <WelcomeEmailCustomizeModalContent
                    config={config.data.config}
                    open={isOpen}
                    settings={settings.data.settings}
                    siteData={site.data.site}
                    title='Email design'
                    onClose={() => setIsOpen(false)}
                />
            ) : null}
        </>
    );
};

export default EmailDesignButton;
