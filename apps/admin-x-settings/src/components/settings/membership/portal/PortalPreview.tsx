import PortalFrame from './PortalFrame';
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
        tabContents = <>Account preview</>;
        break;
    case 'links':
        tabContents = <>Links</>;
        break;
    default:
        tabContents = (
            <>
                <PortalFrame settings={localSettings} tiers={localTiers} />
            </>
        );
        break;
    }

    return tabContents;
};

export default PortalPreview;