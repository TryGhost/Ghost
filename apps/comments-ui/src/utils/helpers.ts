import {Comment, Member, TranslationFunction} from '../AppContext';

export function formatNumber(number: number): string {
    if (number !== 0 && !number) {
        return '';
    }

    // Adds in commas for separators
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatRelativeTime(dateString: string, t: TranslationFunction): string {
    const date = new Date(dateString);
    const now = new Date();

    // Diff is in seconds
    let diff = Math.round((now.getTime() - date.getTime()) / 1000);
    if (diff < 5) {
        return t('Just now');
    }

    if (diff < 60) {
        return t('{{amount}} seconds ago', {amount: diff});
    }

    // Diff in minutes
    diff = diff / 60;
    if (diff < 60) {
        if (Math.floor(diff) === 1) {
            return t(`One min ago`);
        }
        return t('{{amount}} mins ago', {amount: Math.floor(diff)});
    }

    // First check for yesterday
    // (we ignore setting 'yesterday' if close to midnight and keep using minutes until 1 hour difference)
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate()) {
        return t('Yesterday');
    }

    // Diff in hours
    diff = diff / 60;
    if (diff < 24) {
        if (Math.floor(diff) === 1) {
            return t(`One hour ago`);
        }
        return t('{{amount}} hrs ago', {amount: Math.floor(diff)});
    }

    // Diff in days
    diff = diff / 24;
    if (diff < 7) {
        if (Math.floor(diff) === 1) {
            // Special case, we should compare based on dates in the future instead
            return t(`One day ago`);
        }
        return t('{{amount}} days ago', {amount: Math.floor(diff)});
    }

    // Diff in weeks
    diff = diff / 7;
    if (diff < 4) {
        if (Math.floor(diff) === 1) {
            // Special case, we should compare based on dates in the future instead
            return t(`One week ago`);
        }
        return t('{{amount}} weeks ago', {amount: Math.floor(diff)});
    }

    // Diff in months
    diff = diff * 7 / 30;
    if (diff < 12) {
        if (Math.floor(diff) === 1) {
            // Special case, we should compare based on dates in the future instead
            return t(`One month ago`);
        }
        return t('{{amount}} months ago', {amount: Math.floor(diff)});
    }

    // Diff in years
    diff = diff * 30 / 365;
    if (Math.floor(diff) === 1) {
        // Special case, we should compare based on dates in the future instead
        return t(`One year ago`);
    }
    return t('{{amount}} years ago', {amount: Math.floor(diff)});
}

export function formatExplicitTime(dateString: string): string {
    const date = new Date(dateString);

    const day = date.toLocaleDateString('en-us', {day: '2-digit'}); // eg. 01
    const month = date.toLocaleString('en-us', {month: 'short'}); // eg. Jan
    const year = date.getFullYear(); // eg. 2022
    const hour = (date.getHours() < 10 ? '0' : '') + date.getHours(); // eg. 02
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(); // eg. 09

    return `${day} ${month} ${year} ${hour}:${minute}`;
}

export function getInitials(name: string): string {
    if (!name) {
        return '';
    }
    const parts = name.split(' ');

    if (parts.length === 0) {
        return '';
    }

    if (parts.length === 1) {
        return parts[0].substring(0, 1).toLocaleUpperCase();
    }

    return parts[0].substring(0, 1).toLocaleUpperCase() + parts[parts.length - 1].substring(0, 1).toLocaleUpperCase();
}

export function getMemberName(member: Member | null, t: TranslationFunction) {
    if (!member) {
        return t('Deleted member');
    }

    if (!member.name) {
        return t('Anonymous');
    }

    return member.name;
}

export function getMemberNameFromComment(comment: Comment, t: TranslationFunction) {
    return getMemberName(comment.member, t);
}

export function getMemberInitialsFromComment(comment: Comment, t: TranslationFunction) {
    return getInitials(getMemberName(comment.member, t));
}

// Rudimentary check for screen width
// Note, this should be the same as breakpoint defined in Tailwind config
export function isMobile() {
    return (Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) < 480);
}

export function isCommentPublished(comment: Comment) {
    return comment.status === 'published';
}

/**
 * Returns the y scroll position (top) of the main window of a given element that is in one or multiple stacked iframes
 */
export const getScrollToPosition = (element: HTMLElement) => {
    let yOffset = 0;

    // Because we are working in an iframe, we need to resolve the position inside this iframe to the position in the top window
    // Get the window of the element, not the window (which is the top window)
    let currentWindow: Window | null = element.ownerDocument.defaultView;

    // Loop all iframe parents (if we have multiple)
    while (currentWindow && currentWindow !== window) {
        const currentParentWindow = currentWindow.parent;
        for (let idx = 0; idx < currentParentWindow.frames.length; idx++) {
            if (currentParentWindow.frames[idx] === currentWindow) {
                for (const frameElement of currentParentWindow.document.getElementsByTagName('iframe')) {
                    if (frameElement.contentWindow === currentWindow) {
                        const rect = frameElement.getBoundingClientRect();
                        yOffset += rect.top + currentWindow.pageYOffset;
                    }
                }
                currentWindow = currentParentWindow;
                break;
            }
        }
    }

    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    return y;
};

/**
 * Scroll to an element that is in an iframe, only if it is outside the current viewport
 */
export const scrollToElement = (element: HTMLElement) => {
    // Is the form already in view?
    const elementHeight = element.offsetHeight;

    // Start y position of the form
    const yMin = getScrollToPosition(element);

    // Y position of the end of the form
    const yMax = yMin + elementHeight;

    // Trigger scrolling when yMin and yMax is closer than this to the border of the viewport
    const offset = 64;

    const viewportHeight = window.innerHeight;
    const viewPortYMin = window.scrollY;
    const viewPortYMax = viewPortYMin + viewportHeight;

    if (yMin - offset < viewPortYMin || yMax + offset > viewPortYMax) {
        // Center the form in the viewport
        const yCenter = (yMin + yMax) / 2;

        window.scrollTo({
            top: yCenter - viewportHeight / 2,
            left: 0,
            behavior: 'smooth'
        });
    }
};

export function getCommentInReplyToSnippet(comment: {html?: string}): string {
    const {html = ''} = comment;

    // It would be nicer to use DOMParser here so we can use `innerText` instead
    // of `textContent` to have a more native "visible content" implementation.
    // However, we can't test that because JSDOM doesn't support `innerText`
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Strip non-visible elements (rough innerText proxy)
    tempDiv.querySelectorAll('script, style, link, meta, noscript, title').forEach(el => el.remove());

    // Remove blockquotes to avoid showing content that was quoted from a previous comment,
    // we want the snippet to contain unique content from the comment being replied to
    tempDiv.querySelectorAll('blockquote').forEach(el => el.remove());

    let text = tempDiv.textContent || '';

    text = text.replace('\n', ' ');
    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    return text.substring(0, 100);
}
