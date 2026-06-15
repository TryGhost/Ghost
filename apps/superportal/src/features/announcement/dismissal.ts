/**
 * Dismissal state helpers for the announcement bar.
 *
 * Persistence strategy (matching apps/announcement-bar):
 * - Uses sessionStorage so dismissal resets on a new browser session.
 * - Content-change detection: if the announcement HTML changes since the last
 *   visit, the bar reappears regardless of whether the user previously dismissed it.
 */

const VISIBILITY_KEY = 'isAnnouncementBarVisible';
const CONTENT_KEY = 'announcementBarContent';

/** Returns true if the bar should be shown for the given content string. */
export function shouldShowBar(content: string): boolean {
    if (contentChanged(content)) {
        // New or changed content → reset dismissal and store the new content.
        saveContent(content);
        saveVisibility(true);
        return true;
    }
    return getVisibility();
}

/** Persist the user's dismiss action. */
export function dismissBar(): void {
    saveVisibility(false);
}

function contentChanged(content: string): boolean {
    const prev = sessionStorage.getItem(CONTENT_KEY);
    return prev !== content;
}

function saveContent(content: string): void {
    sessionStorage.setItem(CONTENT_KEY, content);
}

function saveVisibility(visible: boolean): void {
    if (visible) {
        sessionStorage.setItem(VISIBILITY_KEY, '1');
    } else {
        sessionStorage.removeItem(VISIBILITY_KEY);
    }
}

function getVisibility(): boolean {
    return sessionStorage.getItem(VISIBILITY_KEY) !== null;
}
