import PortalFrame from './PortalFrame';
import PortalLinks from './PortalLinks';
import React from 'react';
import {Setting, Tier} from '@tryghost/admin-x-framework';
import {getPortalPreviewUrl} from '../../../../utils/getPortalPreviewUrl';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

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
                <PortalFrame href={href || ''} selectedTab={selectedTab} />
            </>
        );
        break;
    case 'links':
        tabContents = <PortalLinks />;
        break;
    default:
        tabContents = (
            <>
                <PortalFrame href={href || ''} selectedTab={selectedTab} />
            </>
        );
        break;
    }

    return tabContents;
};

export default PortalPreview;
