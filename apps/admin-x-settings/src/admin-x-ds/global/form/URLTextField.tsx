import React, {useEffect, useState} from 'react';
import TextField, {TextFieldProps} from './TextField';
import validator from 'validator';

const formatUrl = (value: string, baseUrl: string) => {
    let url = value.trim();

    if (!url) {
        return {save: '/', display: baseUrl};
    }

    // if we have an email address, add the mailto:
    if (validator.isEmail(url)) {
        return {save: `mailto:${url}`, display: `mailto:${url}`};
    }

    const isAnchorLink = url.match(/^#/);

    if (isAnchorLink) {
        return {save: url, display: url};
    }

    // If it doesn't look like a URL, leave it as is rather than assuming it's a pathname etc
    if (!url.match(/^[a-zA-Z0-9-]+:/) && !url.match(/^(\/|\?)/)) {
        return {save: url, display: url};
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url, baseUrl);
    } catch (e) {
        return {save: url, display: url};
    }
    const parsedBaseUrl = new URL(baseUrl);

    let isRelativeToBasePath = parsedUrl.pathname && parsedUrl.pathname.indexOf(parsedBaseUrl.pathname) === 0;

    // if our path is only missing a trailing / mark it as relative
    if (`${parsedUrl.pathname}/` === parsedBaseUrl.pathname) {
        isRelativeToBasePath = true;
    }

    const isOnSameHost = parsedUrl.host === parsedBaseUrl.host;

    // if relative to baseUrl, remove the base url before sending to action
    if (!isAnchorLink && isOnSameHost && isRelativeToBasePath) {
        url = url.replace(/^[a-zA-Z0-9-]+:/, '');
        url = url.replace(/^\/\//, '');
        url = url.replace(parsedBaseUrl.host, '');
        url = url.replace(parsedBaseUrl.pathname, '');

        // handle case where url path is same as baseUrl path but missing trailing slash
        if (parsedUrl.pathname.slice(-1) !== '/') {
            url = url.replace(parsedBaseUrl.pathname.slice(0, -1), '');
        }

        if (!url.match(/^\//)) {
            url = `/${url}`;
        }

        if (!url.match(/\/$/) && !url.match(/[.#?]/)) {
            url = `${url}/`;
        }
    }

    if (url.match(/^(\/\/|#)/)) {
        return {save: url, display: url};
    }

    // we update with the relative URL but then transform it back to absolute
    // for the input value. This avoids problems where the underlying relative
    // value hasn't changed even though the input value has
    return {save: url, display: new URL(url, baseUrl).toString()};
};

/**
 * A text field that displays and saves relative URLs as absolute relative to a given base URL (probably the site URL).
 *
 * - URLs for the current site are displayed as absolute (e.g. `https://my.site/test/`) but saved as relative (e.g. `/test/`)
 * - URLs on other sites are displayed and saved as absolute (e.g. `https://other.site/test/`)
 * - Email addresses are displayed and saved as "mailto:" URLs (e.g. `mailto:test@my.site`)
 * - Anchor links are displayed and saved as-is (e.g. `#test`)
 * - Values that don't look like URLs are displayed and saved as-is (e.g. `test`)
 */
const URLTextField: React.FC<Omit<TextFieldProps, 'onChange'> & {
    baseUrl: string;
    onChange: (value: string) => void;
}> = ({baseUrl, value, onChange, ...props}) => {
    const [displayedUrl, setDisplayedUrl] = useState('');

    useEffect(() => {
        setDisplayedUrl(formatUrl(value || '', baseUrl).display);
    }, [value, baseUrl]);

    const updateUrl = () => {
        const {save, display} = formatUrl(displayedUrl, baseUrl);

        setDisplayedUrl(display);
        onChange(save);
    };

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
        if (displayedUrl === baseUrl) {
            // Position the cursor at the end of the input
            setTimeout(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length));
        }

        props.onFocus?.(e);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        // Delete the "placeholder" value all at once
        if (displayedUrl === baseUrl && ['Backspace', 'Delete'].includes(e.key)) {
            setDisplayedUrl('');
        }

        props.onKeyDown?.(e);
    };

    return (
        <TextField
            {...props}
            value={displayedUrl}
            onBlur={updateUrl}
            onChange={e => setDisplayedUrl(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
        />
    );
};

export default URLTextField;
