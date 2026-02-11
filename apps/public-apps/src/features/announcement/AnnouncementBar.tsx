/**
 * Announcement Bar Component
 *
 * Displays a dismissible announcement banner at the top of the page.
 * Uses sessionStorage to persist visibility state.
 */

import {useState, useEffect} from 'react';
import {CloseIcon} from './CloseIcon';
import announcementStyles from './announcement-bar.css?inline';

// Inject styles once when module loads
const STYLE_ID = 'gh-announcement-bar-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = announcementStyles;
    document.head.appendChild(style);
}

interface AnnouncementSettings {
    announcement: string;
    announcement_background: 'light' | 'accent' | 'dark';
}

interface AnnouncementBarProps {
    settings: AnnouncementSettings;
}

const BAR_VISIBILITY_STORAGE_KEY = 'isAnnouncementBarVisible';
const BAR_CONTENT_STORAGE_KEY = 'announcementBarContent';

function shouldShowBar(content: string): boolean {
    const contentChanged = isContentChanged(content);

    if (contentChanged) {
        setBarVisibility(true);
        setContent(content);
        return true;
    }

    const isBarVisible = getBarVisibility();
    return !!isBarVisible;
}

function setContent(content: string): void {
    sessionStorage.setItem(BAR_CONTENT_STORAGE_KEY, content);
}

function isContentChanged(content: string): boolean {
    if (!content) {
        return false;
    }
    const prevContent = sessionStorage.getItem(BAR_CONTENT_STORAGE_KEY);
    return content !== prevContent;
}

function setBarVisibility(state: boolean): void {
    if (state) {
        sessionStorage.setItem(BAR_VISIBILITY_STORAGE_KEY, 'true');
    } else {
        sessionStorage.removeItem(BAR_VISIBILITY_STORAGE_KEY);
    }
}

function getBarVisibility(): boolean {
    return sessionStorage.getItem(BAR_VISIBILITY_STORAGE_KEY) === 'true';
}

export function AnnouncementBar({settings}: AnnouncementBarProps) {
    const [visible, setVisible] = useState(() => shouldShowBar(settings.announcement));

    useEffect(() => {
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

    if (!visible || !settings.announcement) {
        return null;
    }

    const className = 'gh-announcement-bar ' + settings.announcement_background;

    return (
        <div className={className}>
            <div
                className="gh-announcement-bar-content"
                dangerouslySetInnerHTML={{__html: settings.announcement}}
            />
            <button aria-label="close" onClick={handleButtonClick}>
                <CloseIcon />
            </button>
        </div>
    );
}
