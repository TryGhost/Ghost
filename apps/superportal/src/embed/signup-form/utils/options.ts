import {useCallback, useEffect, useState} from 'react';
import {SignupFormOptions} from './helpers';

/**
 * Read signup-form options from the script tag's `data-*` attributes and
 * re-derive them whenever attributes change (Storybook / preview tooling
 * mutation support).
 */
export function useOptions(scriptTag: HTMLElement): SignupFormOptions {
    const buildOptions = useCallback((): SignupFormOptions => {
        const labels: string[] = [];
        let i = 1;
        while (scriptTag.dataset[`label-${i}`]) {
            labels.push(scriptTag.dataset[`label-${i}`] as string);
            i++;
        }

        return {
            title: scriptTag.dataset.title ?? undefined,
            description: scriptTag.dataset.description ?? undefined,
            icon: scriptTag.dataset.icon ?? undefined,
            backgroundColor: scriptTag.dataset.backgroundColor ?? undefined,
            textColor: scriptTag.dataset.textColor ?? undefined,
            buttonColor: scriptTag.dataset.buttonColor ?? undefined,
            buttonTextColor: scriptTag.dataset.buttonTextColor ?? undefined,
            site: scriptTag.dataset.site ?? window.location.origin,
            labels,
            locale: scriptTag.dataset.locale ?? 'en'
        };
    }, [scriptTag]);

    const [options, setOptions] = useState<SignupFormOptions>(buildOptions);

    useEffect(() => {
        const observer = new MutationObserver((list) => {
            if (list.some(m => m.type === 'attributes')) {
                setOptions(buildOptions());
            }
        });
        observer.observe(scriptTag, {attributes: true});
        return () => observer.disconnect();
    }, [scriptTag, buildOptions]);

    return options;
}
