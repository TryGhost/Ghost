import AutomationEmailDesignModal from './automation-email-design-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {Button} from '@tryghost/shade/components';
import {toast} from 'sonner';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

const EmailDesignButton: React.FC = () => {
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();

    const requests = [settings, site, config];
    const error = requests.map(request => request.error).find(Boolean);

    React.useEffect(() => {
        if (error) {
            // Keep the Automations page usable if email design data fails to load.
            // eslint-disable-next-line no-console
            console.error('Failed to load email design data', error);
        }
    }, [error]);

    const isLoading = requests.some(request => request.isLoading);
    const handleClick = () => {
        if (error || !config.data || !settings.data || !site.data) {
            toast.error('Unable to load email design settings. Please try again.');
            return;
        }

        NiceModal.show(AutomationEmailDesignModal, {
            config: config.data.config,
            settings: settings.data.settings,
            siteData: site.data.site
        });
    };

    return (
        <NiceModal.Provider>
            <Button
                disabled={isLoading}
                variant='outline'
                onClick={handleClick}
            >
                Email design
            </Button>
        </NiceModal.Provider>
    );
};

export default EmailDesignButton;
