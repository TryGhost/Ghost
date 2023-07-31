import React from 'react';

import './AnnouncementBar.css';
import {ReactComponent as CloseIcon} from '../icons/clear.svg';

export function AnnouncementBar({settings = {}}) {
    const [visible, setVisible] = React.useState(shouldShowBar(settings.announcement));

    React.useEffect(() => {
        if (!settings.announcement) {
            return;
        }

        if (shouldShowBar(settings.announcement)) {
            setVisible(true);
        }
    }, [settings.announcement]);

    const handleButtonClick = () => {
        setVisible(false);
        setBarVisibility(false);
    };

    if (!visible) {
        return null;
    }

    if (!settings.announcement) {
        return null;
    }

    let className = 'gh-announcement-bar ' + settings.announcement_background;
    return (
        <div className={className}>
            <div className="gh-announcement-bar-content" dangerouslySetInnerHTML={{__html: settings.announcement}}></div>
            <button aria-label="close" onClick={handleButtonClick}>
                <CloseIcon />
            </button>
        </div>
    );
}

const BAR_VISIBILITY_STORAGE_KEY = 'isAnnouncementBarVisible';
const BAR_CONTENT_STORAGE_KEY = 'announcementBarContent';

function shouldShowBar(content) {
    const contentChanged = isContentChanged(content);

    if (contentChanged) {
        setBarVisibility(true);
        setContent(content);

        return true;
    }

    const isBarVisible = getBarVisibility();
    return !!isBarVisible;
}

function setContent(content) {
    sessionStorage.setItem(BAR_CONTENT_STORAGE_KEY, content);
}

function isContentChanged(content) {
    if (!content) {
        return false;
    }
    const prevContent = sessionStorage.getItem(BAR_CONTENT_STORAGE_KEY);

    return content !== prevContent;
}
function setBarVisibility(state) {
    if (state) {
        sessionStorage.setItem(BAR_VISIBILITY_STORAGE_KEY, state);
    } else {
        sessionStorage.removeItem(BAR_VISIBILITY_STORAGE_KEY);
    }
}

function getBarVisibility() {
    return sessionStorage.getItem(BAR_VISIBILITY_STORAGE_KEY);
}
