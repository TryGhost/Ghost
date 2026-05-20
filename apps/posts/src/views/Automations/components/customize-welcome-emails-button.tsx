import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import WelcomeEmailCustomizeModal from '@tryghost/admin-x-settings/src/components/settings/membership/member-emails/welcome-email-customize-modal';
import {Button} from '@tryghost/shade/components';
import {GlobalDataStaticProvider} from '@tryghost/admin-x-settings/src/components/providers/global-data-provider';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';

const CustomizeWelcomeEmailsButton: React.FC = () => {
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();
    const currentUser = useCurrentUser();

    const requests = [settings, site, config, currentUser];
    const error = requests.map(request => request.error).find(Boolean);

    if (error) {
        throw error;
    }

    const isLoading = requests.some(request => request.isLoading);

    if (isLoading) {
        return (
            <Button disabled={true} variant='outline'>
                Email design
            </Button>
        );
    }

    return (
        <GlobalDataStaticProvider value={{
            settings: settings.data!.settings,
            siteData: site.data!.site,
            config: config.data!.config,
            currentUser: currentUser.data!
        }}>
            <NiceModal.Provider>
                <Button variant='outline' onClick={() => NiceModal.show(WelcomeEmailCustomizeModal, {title: 'Email design'})}>
                    Email design
                </Button>
            </NiceModal.Provider>
        </GlobalDataStaticProvider>
    );
};

export default CustomizeWelcomeEmailsButton;
