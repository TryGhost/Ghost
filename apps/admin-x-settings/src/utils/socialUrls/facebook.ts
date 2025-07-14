import validator from 'validator';

export const FB_ERRORS = {
    INVALID_URL: 'The URL must be in a format like https://www.facebook.com/yourPage, https://www.facebook.com/pages/PageName/123456789, or https://www.facebook.com/groups/GroupName',
    INVALID_USERNAME: 'Facebook username must be 5-50 characters long and contain only letters, numbers, and periods',
    INVALID_PAGE_FORMAT: 'Facebook page URL must be in format pages/PageName/PageId where 1) PageName must be 5-50 characters long and contain only letters, numbers, and periods, and 2) PageId is 5-50 characters long and is numeric.',
    INVALID_GROUP_FORMAT: 'Facebook group URL must be in format groups/GroupName. GroupName must be 5-50 characters long and contain only letters, numbers, and periods.'
} as const;

const PATH_TYPES = ['pages', 'groups'] as const;
type PathType = typeof PATH_TYPES[number];

// Facebook username: 5-50 chars, alphanumeric + periods only
// fb docs: https://www.facebook.com/help/105399436216001/
const USERNAME_REGEX = /^[a-zA-Z0-9.]{5,50}$/;
// page ids are numeric
const PAGE_ID_REGEX = /^[0-9]{5,}$/;

// Regex to extract handles from Facebook URLs
// Valid formats:
// - https://www.facebook.com/username
// - https://fb.me/username  
// - https://www.facebook.com/pages/company/643146772483269
// - https://fb.me/pages/PageName/123456789
// - https://www.facebook.com/groups/GroupName
// - https://fb.me/groups/GroupName
// - Optional: protocol (https://), www, legacy #! fragment, trailing slash
// Also matches incomplete URLs like pages/company or groups (for proper error handling)
// And URLs with extra parts like pages/company/123/extra (for proper rejection)
const FACEBOOK_URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.me)\/(?:#!\/)?(?:(pages)(?:\/([^/?#]*?))?(?:\/([^/?#]*?))?(?:\/([^/?#]*?))?|(groups)(?:\/([^/?#]*?))?|([^/?#]*?))\/?$/i;

// trims whitespace and removes leading @ or / if it exists
const formatUsername = (value: string) => value.trim().replace(/^[@\/]/, '');

const extractInputParts = (input: string) => {
    // Detect full URL patterns first
    if (/^(https?:\/\/|www\.)/.test(input) || input.includes('facebook.com') || input.includes('fb.me')) {
        const match = input.match(FACEBOOK_URL_REGEX);
        if (!match) {
            throw new Error(FB_ERRORS.INVALID_URL);
        }

        const [, pagesPrefix, pageName, pageId, extraPart, groupsPrefix, groupName, regularUsername] = match;

        if (pagesPrefix !== undefined) {
            // If there's an extra part after pageId, it's invalid
            if (extraPart) {
                throw new Error(FB_ERRORS.INVALID_PAGE_FORMAT);
            }
            // Build handle even if parts are missing (for proper validation)
            const handle = `pages/${pageName || ''}/${pageId || ''}`;
            return {type: 'pages' as PathType, handle: handle};
        }

        if (groupsPrefix !== undefined) {
            // Build handle even if group name is missing (for proper validation)  
            const handle = `groups/${groupName || ''}`;
            return {type: 'groups' as PathType, handle: handle};
        }

        if (regularUsername !== undefined) {
            return {handle: regularUsername};
        }

        throw new Error(FB_ERRORS.INVALID_URL);
    }

    // if it's not a url, we expect a handle like username, @username, pages/name/id, groups/name
    const formatted = formatUsername(input);
    
    if (formatted.startsWith('pages/')) {
        return {type: 'pages' as PathType, handle: formatted};
    }
    
    if (formatted.startsWith('groups/')) {
        return {type: 'groups' as PathType, handle: formatted};
    }
    
    return {handle: formatted};
};

const isValidUsername = (type: PathType | undefined, username: string) => {
    if (type === 'pages') {
        const parts = username.split('/');
        if (parts.length !== 3) {
            return false;
        }

        const [, pageName, pageId] = parts;
        return pageName && pageId && PAGE_ID_REGEX.test(pageId);
    }

    if (type === 'groups') {
        const parts = username.split('/');
        if (parts.length !== 2) {
            return false;
        }

        const [, groupName] = parts;
        return groupName && USERNAME_REGEX.test(groupName);
    }

    // Regular username
    return USERNAME_REGEX.test(username);
};

const buildUrl = (handle: string) => {
    const url = `https://www.facebook.com/${handle}`;
    if (!validator.isURL(url)) {
        throw new Error(FB_ERRORS.INVALID_URL);
    }
    return url;
};

export function validateFacebookUrl(input: string) {
    if (!input) {
        return '';
    }

    const {type, handle} = extractInputParts(input);

    // Don't allow any non-facebook URLs that slipped through
    if (handle.match(/^(http|\/\/)/i)) {
        throw new Error(FB_ERRORS.INVALID_URL);
    }

    // Validate handle format
    if (!isValidUsername(type, handle)) {
        if (type === 'pages') {
            throw new Error(FB_ERRORS.INVALID_PAGE_FORMAT);
        } else if (type === 'groups') {
            throw new Error(FB_ERRORS.INVALID_GROUP_FORMAT);
        } else {
            throw new Error(FB_ERRORS.INVALID_USERNAME);
        }
    }

    return buildUrl(handle);
}

export const facebookHandleToUrl = (handle: string) => {
    if (!handle) {
        throw new Error(FB_ERRORS.INVALID_USERNAME);
    }

    const {type, handle: formattedHandle} = extractInputParts(handle);

    // since we made the fb regex a lot more strict, there might be some pre-existing invalid handles 
    // since facebookHandleToUrl throws, this would crash the page. so we use this helper to catch it
    // users will need to fix it to save
    try {
        if (!isValidUsername(type, formattedHandle)) {
            if (type === 'pages') {
                throw new Error(FB_ERRORS.INVALID_PAGE_FORMAT);
            } else if (type === 'groups') {
                throw new Error(FB_ERRORS.INVALID_GROUP_FORMAT);
            } else {
                throw new Error(FB_ERRORS.INVALID_USERNAME);
            }
        }
    } catch (error) {
        return `https://www.facebook.com/${formattedHandle}`;   
    }
    return buildUrl(formattedHandle);
};

export const facebookUrlToHandle = (url: string) => {
    const match = url.match(FACEBOOK_URL_REGEX);
    if (!match) {
        return null;
    }

    const [, pagesPrefix, pageName, pageId, extraPart, groupsPrefix, groupName, regularUsername] = match;

    if (pagesPrefix !== undefined) {
        // If there's an extra part after pageId, it's invalid
        if (extraPart) {
            return null;
        }
        // Must have both pageName and pageId for valid pages URL
        if (!pageName || !pageId || !PAGE_ID_REGEX.test(pageId)) {
            return null;
        }
        return `pages/${pageName}/${pageId}`;
    }

    if (groupsPrefix !== undefined) {
        // Must have groupName for valid groups URL
        if (!groupName || !USERNAME_REGEX.test(groupName)) {
            return null;
        }
        return `groups/${groupName}`;
    }

    if (regularUsername !== undefined) {
        // Validate that the username is valid
        if (!USERNAME_REGEX.test(regularUsername)) {
            return null;
        }
        return regularUsername;
    }

    return null;
};