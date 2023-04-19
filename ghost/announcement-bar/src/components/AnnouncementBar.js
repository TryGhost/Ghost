import React from 'react';

import './AnnouncementBar.css';
import {ReactComponent as CloseIcon} from '../icons/clear.svg';

export function AnnouncementBar({settings}) {
    // eslint-disable-next-line no-unused-vars
    const [data, setData] = React.useState({content: '<p>Content with <a href="https://ghost.org/">link</a></p>'});

    return (
        <div className="gh-announcement-bar dark">
            <div className="gh-announcement-bar-content" dangerouslySetInnerHTML={{__html: data.content}}></div>
            <button>
                <CloseIcon />
            </button>
        </div>
    );
}
