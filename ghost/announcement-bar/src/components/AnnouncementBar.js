import React from 'react';

import './AnnouncementBar.css';

export function AnnouncementBar({settings}) {
    // eslint-disable-next-line no-unused-vars
    const [data, setData] = React.useState({content: '<p>Content with <a href="https://ghost.org/">link</a></p>'});

    const accentColor = settings?.accent_color;
    return (
        <div className="gh-announcement-bar" style={{backgroundColor: accentColor}}>
            <div dangerouslySetInnerHTML={{__html: data.content}}></div>
        </div>
    );
}
