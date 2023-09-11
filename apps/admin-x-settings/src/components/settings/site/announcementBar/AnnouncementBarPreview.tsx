import IframeBuffering, {injectCss} from '../../../../utils/IframeBuffering';
import React from 'react';

const getPreviewData = (announcementBackgroundColor?: string, announcementContent?: string, visibility?: string[]) => {
    const params = new URLSearchParams();
    params.append('announcement_bg', announcementBackgroundColor || 'accent');
    params.append('announcement', announcementContent || '');
    if (visibility && visibility.length > 0) {
        params.append('announcement_vis', visibility?.join(',') || '');
    }
    return params.toString();
};

type AnnouncementBarSettings = {
    announcementBackgroundColor?: string;
    announcementContent?: string;
    url: string;
    visibility?: string[];
};

const AnnouncementBarPreview: React.FC<AnnouncementBarSettings> = React.memo(({announcementBackgroundColor, announcementContent, url, visibility}) => {
    if (!url) {
        return null;
    }

    const xPreview = getPreviewData(announcementBackgroundColor, announcementContent, visibility);

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
    const prevXPreview = getPreviewData(prevProps.announcementBackgroundColor, prevProps.announcementContent, prevProps.visibility);
    const nextXPreview = getPreviewData(nextProps.announcementBackgroundColor, nextProps.announcementContent, nextProps.visibility);

    // we can also rerender if the url has changed

    const prevUrl = prevProps.url;
    const nextUrl = nextProps.url;

    if (prevUrl !== nextUrl) {
        return false;
    }
    
    return prevXPreview === nextXPreview;
});
AnnouncementBarPreview.displayName = 'AnnouncementBarPreview';
export default AnnouncementBarPreview;
