import React from 'react';

interface PortalPreviewProps {
    selectedTab: string;
}

const PortalPreview: React.FC<PortalPreviewProps> = ({
    selectedTab = 'signup'
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
        tabContents = <>Signup preview</>;
        break;
    }

    return tabContents;
};

export default PortalPreview;