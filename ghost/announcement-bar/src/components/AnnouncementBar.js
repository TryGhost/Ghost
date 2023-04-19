import React from 'react';

import './AnnouncementBar.css';
import {ReactComponent as CloseIcon} from '../icons/clear.svg';

export function AnnouncementBar({settings}) {
    const [visible, setVisible] = React.useState(true);
    // eslint-disable-next-line no-unused-vars
    const [data, setData] = React.useState({content: '<p>Content with <a href="https://ghost.org/">link</a></p>'});

    if (!visible) {
        return null;
    }

    return (
        <div className="gh-announcement-bar dark">
            <div className="gh-announcement-bar-content" dangerouslySetInnerHTML={{__html: data.content}}></div>
            <button onClick={() => setVisible(false)}>
                <CloseIcon />
            </button>
        </div>
    );
}
