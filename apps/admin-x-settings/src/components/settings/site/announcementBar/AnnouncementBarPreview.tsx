import IframeBuffering, {injectCss} from '../../../../utils/IframeBuffering';
import React, {useMemo, useState} from 'react';

const getPreviewData = (announcementBackgroundColor?: string, announcementContent?: string) => {
    const params = new URLSearchParams();
    params.append('announcement_bg', announcementBackgroundColor || 'accent');
    params.append('announcement', announcementContent || '');
    params.append('announcement_vis', 'paid_members');
    return params.toString();
};

type AnnouncementBarSettings = {
    announcementBackgroundColor?: string;
    announcementContent?: string;
    url: string;
};

const AnnouncementBarPreview: React.FC<AnnouncementBarSettings> = React.memo(({announcementBackgroundColor, announcementContent, url}) => {
    AnnouncementBarPreview.displayName = 'AnnouncementBarPreview';

    if (!url) {
        return null;
    }

    const xPreview = getPreviewData(announcementBackgroundColor, announcementContent);

    return (
        <IframeBuffering
            dataModifier={injectCss}
            url={url}
            xPreview={xPreview}
        />
    );
}, (prevProps, nextProps) => {
    // This function determines if the component should rerender. If the function returns true, then it won't rerender.
    // In this case, we only want to rerender if xPreview has changed.
    const prevXPreview = getPreviewData(prevProps.announcementBackgroundColor, prevProps.announcementContent);
    const nextXPreview = getPreviewData(nextProps.announcementBackgroundColor, nextProps.announcementContent);
    
    return prevXPreview === nextXPreview;
});

export default AnnouncementBarPreview;
