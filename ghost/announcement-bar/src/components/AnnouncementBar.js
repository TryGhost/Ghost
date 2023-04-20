import React from 'react';

import './AnnouncementBar.css';
import {ReactComponent as CloseIcon} from '../icons/clear.svg';

export function AnnouncementBar({settings}) {
    const [visible, setVisible] = React.useState(isBarVisible());

    const handleButtonClick = () => {
        setBarVisibility();
        setVisible(false);
    };

    if (!visible) {
        return null;
    }

    if (!settings?.announcement) {
        return null;
    }

    let className = 'gh-announcement-bar ' + settings?.announcement_background;
    return (
        <div className={className}>
            <div className="gh-announcement-bar-content" dangerouslySetInnerHTML={{__html: settings?.announcement}}></div>
            <button onClick={handleButtonClick}>
                <CloseIcon />
            </button>
        </div>
    );
}

const BAR_STORAGE_KEY = 'isAnnouncementBarVisible';
function setBarVisibility(state = 'true') {
    sessionStorage.setItem(BAR_STORAGE_KEY, state);
}

function isBarVisible() {
    return !sessionStorage.getItem(BAR_STORAGE_KEY);
}
