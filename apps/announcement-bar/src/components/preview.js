import React from 'react';
import {AnnouncementBar} from './announcement-bar';

export function Preview({previewData}) {
    return (
        <AnnouncementBar settings={previewData} />
    );
}
