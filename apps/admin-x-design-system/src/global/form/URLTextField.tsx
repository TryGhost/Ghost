import React, {useEffect, useState} from 'react';
import {useFocusContext} from '../../providers/DesignSystemProvider';
import TextField, {TextFieldProps} from './TextField';
import {formatUrl} from '../../utils/formatUrl';

export interface URLTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
    baseUrl?: string;
    transformPathWithoutSlash?: boolean;
    nullable?: boolean;
    value: string | null;
    onChange: (value: string | null) => void;
}

/**
 * A text field that displays and saves relative URLs as absolute relative to a given base URL (probably the site URL).
 *
 * - URLs for the current site are displayed as absolute (e.g. `https://my.site/test/`) but saved as relative (e.g. `/test/`)
 * - URLs on other sites are displayed and saved as absolute (e.g. `https://other.site/test/`)
 * - Email addresses are displayed and saved as "mailto:" URLs (e.g. `mailto:test@my.site`)
 * - Anchor links are displayed and saved as-is (e.g. `#test`)
 * - Values that don't look like URLs are displayed and saved as-is (e.g. `test`)
 */
const URLTextField: React.FC<URLTextFieldProps> = ({baseUrl, value, transformPathWithoutSlash, nullable, onChange, ...props}) => {
    const [displayedUrl, setDisplayedUrl] = useState('');
    const {setFocusState} = useFocusContext();

    useEffect(() => {
        setDisplayedUrl(formatUrl(value || '', baseUrl, nullable).display);
    }, [value, baseUrl, nullable]);

    const updateUrl = () => {
        let urls = formatUrl(displayedUrl, baseUrl, nullable);

        // If the user entered something like "bla", try to parse it as a relative URL
        // If parsing as "/bla" results in a valid URL, use that instead
        if (transformPathWithoutSlash && !urls.display.includes('//') && (displayedUrl || !nullable)) {
            const candidate = formatUrl('/' + displayedUrl, baseUrl, nullable);

            if (candidate.display.includes('//')) {
                urls = candidate;
            }
        }

        setDisplayedUrl(urls.display);
        if (urls.save !== value) {
            onChange(urls.save);
        }
        setFocusState(false);
    };

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
        if (displayedUrl === baseUrl) {
            // Position the cursor at the end of the input
            setTimeout(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length));
        }

        props.onFocus?.(e);
        setFocusState(true);
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
