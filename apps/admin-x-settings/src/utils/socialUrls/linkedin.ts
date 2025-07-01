import validator from 'validator';

// Validates and normalizes LinkedIn URLs or handles
export function validateLinkedInUrl(newUrl: string) {
    const errMessage = 'The URL must be in a format like https://www.linkedin.com/in/yourUsername';
    const invalidUsernameMessage = 'Your Username is not a valid LinkedIn Username';
    if (!newUrl) {
        return '';
    }

    let username: string;
    let regionalCode: string | undefined;
    let pathType: string = '';

    // Extract username from URL or handle
    if (newUrl.startsWith('http') || newUrl.startsWith('www.') || newUrl.includes('linkedin.com')) {
        // Check for linkedin.com domain (including regional, e.g., ca.linkedin.com)
        if (!newUrl.includes('linkedin.com')) {
            throw new Error(errMessage);
        }
        // Handle regional URLs (e.g., ca.linkedin.com)
        const regionalMatch = newUrl.match(/(?:https?:\/\/)?(?:www\.)?([a-z]{2}\.)?linkedin\.com\/(in|pub|company|school)\/@?([^/]+)/);
        if (!regionalMatch) {
            throw new Error(errMessage);
        }
        regionalCode = regionalMatch[1]; // e.g., 'ca.' or undefined
        pathType = regionalMatch[2]; // 'in', 'pub', 'company', or 'school'
        username = `${pathType}/${regionalMatch[3]}`;
    } else {
        // Handle username or @username
        username = newUrl.startsWith('@') ? newUrl.slice(1) : newUrl;
    }
    
    // For /pub/ URLs, allow longer, non-custom formats
    if (pathType === 'pub' && !username.match(/^pub\/[a-zA-Z0-9._-]{3,100}(?:-[a-f0-9]+)?$/)) {
        throw new Error(invalidUsernameMessage);
    } else if (pathType !== 'pub' && !username.match(/^(?:in\/|company\/|school\/)?[a-zA-Z0-9._-]{3,100}$/)) {
        // Validate username for in/, company/, and school/ URLs (custom handles)
        throw new Error(invalidUsernameMessage);
    }

    const usernameWithPathType = username.includes('/') ? username : `in/${username}`;
    // Construct and validate full URL
    const normalizedUrl = regionalCode
        ? `https://${regionalCode}linkedin.com/${usernameWithPathType}`
        : `https://www.linkedin.com/${usernameWithPathType}`;
    if (!validator.isURL(normalizedUrl)) {
        throw new Error(errMessage);
    }

    return normalizedUrl;
}

// Converts a LinkedIn handle to a full URL
export const linkedinHandleToUrl = (handle: string) => {
    const errMessage = 'Your Username is not a valid LinkedIn Username';
    if (!handle) {
        throw new Error(errMessage);
    }

    let username = handle;
    if (username.startsWith('@')) {
        username = username.slice(1);
    }

    // Validate username for in/, company/, and school/ URLs (alphanumeric, underscore, hyphen, period, 3–100 chars)
    if (!username.match(/^(?:in\/|company\/|school\/)?[a-zA-Z0-9._-]{3,100}$/)) {
        throw new Error(errMessage);
    }

    const usernameWithProfileType = username.includes('/') ? username : `in/${username}`;

    return `https://www.linkedin.com/${usernameWithProfileType}`;
};

// Extracts a LinkedIn handle from a URL
export const linkedinUrlToHandle = (url: string) => {
    const handleMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:[a-z]{2}\.)?linkedin\.com\/(in|pub|company|school)\/@?([^/]*)/);
    return handleMatch ? `${handleMatch[1]}/${handleMatch[2]}` : null;
};
