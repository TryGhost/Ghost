import React from 'react';
import {SignupFormOptions} from '../AppContext';

export function useOptions(scriptTag: HTMLElement) {
    const buildOptions = React.useCallback(() => {
        const labels = [];

        while (scriptTag.dataset[`label-${labels.length + 1}`]) {
            labels.push(scriptTag.dataset[`label-${labels.length + 1}`] as string);
        }

        return {
            title: scriptTag.dataset.title || undefined,
            description: scriptTag.dataset.description || undefined,
            icon: scriptTag.dataset.icon || undefined,
            backgroundColor: scriptTag.dataset.backgroundColor || undefined,
            textColor: scriptTag.dataset.textColor || undefined,
            buttonColor: scriptTag.dataset.buttonColor || undefined,
            buttonTextColor: scriptTag.dataset.buttonTextColor || undefined,
            site: scriptTag.dataset.site || window.location.origin,
            labels,
            locale: scriptTag.dataset.locale || 'en'
        };
    }, [scriptTag]);

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
