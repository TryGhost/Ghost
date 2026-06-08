import PortalFrame from './portal-frame';
import PortalLinks from './portal-links';
import React from 'react';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {getPortalPreviewUrl} from '../../../../utils/get-portal-preview-url';
import {useGlobalData} from '../../../providers/global-data-provider';

interface PortalPreviewProps {
    selectedTab: string;
    localSettings: Setting[];
    localTiers: Tier[];
}

const PortalPreview: React.FC<PortalPreviewProps> = ({
    selectedTab = 'signup',
    localSettings,
    localTiers
}) => {
    const {
        siteData,
        config
    } = useGlobalData();

    const href = getPortalPreviewUrl({
        settings: localSettings,
        tiers: localTiers,
        selectedTab,
        siteData,
        config
    });

    let tabContents = <></>;

    switch (selectedTab) {
    case 'account':
        tabContents = (
            <>
                <PortalFrame href={href || ''} portalParent='preview' selectedTab={selectedTab} />
            </>
        );
        break;
    case 'links':
        tabContents = <PortalLinks />;
        break;
    default:
        tabContents = (
            <>
                <PortalFrame href={href || ''} portalParent='preview' selectedTab={selectedTab} />
            </>
        );
        break;
    }

    return tabContents;
};

export default PortalPreview;
