import {type FocusEvent, type KeyboardEvent, useCallback, useEffect, useState} from 'react';
import {formatUrl} from '../utils/format-url';

type UseUrlInputOptions = {
    baseUrl?: string;
    nullable?: boolean;
    transformPathWithoutSlash?: boolean;
    value: string | null;
    onChange: (value: string | null) => void;
};

const useUrlInput = ({baseUrl, nullable, transformPathWithoutSlash, value, onChange}: UseUrlInputOptions) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        setDisplayValue(formatUrl(value || '', baseUrl, nullable).display);
    }, [baseUrl, nullable, value]);

    const commitValue = useCallback(() => {
        let urls = formatUrl(displayValue, baseUrl, nullable);

        if (transformPathWithoutSlash && !urls.display.includes('//') && (displayValue || !nullable)) {
            const candidate = formatUrl(`/${displayValue}`, baseUrl, nullable);

            if (candidate.display.includes('//')) {
                urls = candidate;
            }
        }

        setDisplayValue(urls.display);
        if (urls.save !== value) {
            onChange(urls.save);
        }
    }, [baseUrl, displayValue, nullable, onChange, transformPathWithoutSlash, value]);

    const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
        if (displayValue === baseUrl) {
            setTimeout(() => event.target.setSelectionRange(event.target.value.length, event.target.value.length));
        }
    }, [baseUrl, displayValue]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (displayValue === baseUrl && ['Backspace', 'Delete'].includes(event.key)) {
            setDisplayValue('');
        }
    }, [baseUrl, displayValue]);

    return {
        commitValue,
        displayValue,
        handleFocus,
        handleKeyDown,
        setDisplayValue
    };
};

export default useUrlInput;
