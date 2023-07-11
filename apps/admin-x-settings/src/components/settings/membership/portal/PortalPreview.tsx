import PortalFrame from './PortalFrame';
import PortalLinks from './PortalLinks';
import React from 'react';
import {Setting, Tier} from '../../../../types/api';

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
    let tabContents = <></>;

    switch (selectedTab) {
    case 'account':
        tabContents = (
            <>
                <PortalFrame selectedTab={selectedTab} settings={localSettings} tiers={localTiers} />
            </>
        );
        break;
    case 'links':
        tabContents = <PortalLinks />;
        break;
    default:
        tabContents = (
            <>
                <PortalFrame selectedTab={selectedTab} settings={localSettings} tiers={localTiers} />
            </>
        );
        break;
    }

    return tabContents;
};

export default PortalPreview;