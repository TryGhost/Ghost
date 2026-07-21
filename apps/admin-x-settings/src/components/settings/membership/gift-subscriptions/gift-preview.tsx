import PortalFrame from '../portal/portal-frame';
import React from 'react';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {getGiftPreviewUrl} from '../../../../utils/get-gift-preview-url';
import {useGlobalData} from '../../../providers/global-data-provider';

interface GiftPreviewProps {
    localSettings: Setting[];
}

const GiftPreview: React.FC<GiftPreviewProps> = ({localSettings}) => {
    const {siteData, config} = useGlobalData();

    const href = getGiftPreviewUrl({
        settings: localSettings,
        config,
        siteData
    });

    return <PortalFrame href={href || ''} portalParent='preview' />;
};

export default GiftPreview;
