import React from 'react';
import {AnnouncementBar} from './AnnouncementBar';

export function Preview({previewData}) {
    return (
        <AnnouncementBar settings={previewData} />
    );
}
