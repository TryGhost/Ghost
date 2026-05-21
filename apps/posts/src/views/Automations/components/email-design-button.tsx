import AutomationEmailDesignModal from './automation-email-design-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {Button} from '@tryghost/shade/components';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

const EmailDesignButton: React.FC = () => {
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();

    const requests = [settings, site, config];
    const error = requests.map(request => request.error).find(Boolean);

    if (error) {
        throw error;
    }

    const isLoading = requests.some(request => request.isLoading);

    return (
        <NiceModal.Provider>
            <Button
                disabled={isLoading}
                variant='outline'
                onClick={() => NiceModal.show(AutomationEmailDesignModal, {
                    config: config.data!.config,
                    settings: settings.data!.settings,
                    siteData: site.data!.site
                })}
            >
                Email design
            </Button>
        </NiceModal.Provider>
    );
};

export default EmailDesignButton;
