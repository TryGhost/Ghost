import React from 'react';
import {ColorScheme, SignupFormOptions} from '../AppContext';

const loadColorScheme = (colorScheme: string | undefined): ColorScheme => {
    if (colorScheme === 'light' || colorScheme === 'dark') {
        return colorScheme;
    }

    return 'auto';
};

export function useOptions(scriptTag: HTMLElement) {
    const buildOptions = React.useCallback(() => ({
        title: scriptTag.dataset.title || undefined,
        description: scriptTag.dataset.description || undefined,
        logo: scriptTag.dataset.logo || undefined,
        color: scriptTag.dataset.color || undefined,
        site: scriptTag.dataset.site || window.location.origin,
        labels: scriptTag.dataset.labels ? scriptTag.dataset.labels.split(',') : [],
        colorScheme: loadColorScheme(scriptTag.dataset.colorScheme)
    }), [scriptTag]);

    const [options, setOptions] = React.useState<SignupFormOptions>(buildOptions());

    React.useEffect(() => {
        const observer = new MutationObserver((mutationList) => {
            if (mutationList.some(mutation => mutation.type === 'attributes')) {
                setOptions(buildOptions());
            }
        });

        observer.observe(scriptTag, {
            attributes: true
        });

        return () => {
            observer.disconnect();
        };
    }, [scriptTag, buildOptions]);

    return options;
}
