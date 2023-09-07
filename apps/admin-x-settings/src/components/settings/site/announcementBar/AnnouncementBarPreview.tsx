import IframeBuffering, {injectCss} from '../../../../utils/IframeBuffering';
import React, {useRef} from 'react';

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

const AnnouncementBarPreview: React.FC<AnnouncementBarSettings> = ({announcementBackgroundColor, announcementContent, url}) => {
    const previousPreviewDataRef = useRef<string>('');
    const hasPreviewDataChanged = getPreviewData(announcementBackgroundColor, announcementContent) !== previousPreviewDataRef.current;
    if (hasPreviewDataChanged) {
        previousPreviewDataRef.current = getPreviewData(announcementBackgroundColor, announcementContent);
    }

    return (
        <IframeBuffering
            dataModifier={injectCss}
            fetchConfig={{
                method: 'POST',
                headers: {
                    'Content-Type': 'text/html;charset=utf-8',
                    'x-ghost-preview': getPreviewData(announcementBackgroundColor, announcementContent),
                    Accept: 'text/plain',
                    mode: 'cors',
                    credentials: 'include'
                }
            }}
            url={hasPreviewDataChanged ? url : ''} 
        />
    );
};

export default AnnouncementBarPreview;
