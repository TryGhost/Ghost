import React, {useMemo} from 'react';
import {CommentsOptions} from '../AppContext';

export function useOptions(scriptTag: HTMLElement) {
    const buildOptions = React.useCallback(() => {
        /**
         * @type {HTMLElement}
         */
        const dataset = scriptTag.dataset;
        const siteUrl = dataset.ghostComments || window.location.origin;
        const apiKey = dataset.key;
        const apiUrl = dataset.api;
        const adminUrl = dataset.admin;
        const postId = dataset.postId || '';
        const colorScheme = dataset.colorScheme;
        const avatarSaturation = dataset.avatarSaturation ? parseInt(dataset.avatarSaturation) : undefined;
        const accentColor = dataset.accentColor ?? '#000000';
        const commentsEnabled = dataset.commentsEnabled;
        const title = dataset.title === 'null' ? null : (dataset.title ?? ''); // Null means use the default title. Missing = no title.
        const showCount = dataset.count === 'true';
        const publication = dataset.publication ?? ''; // TODO: replace with dynamic data from script
        const locale = dataset.locale ?? 'en';

        const options = {locale, siteUrl, apiKey, apiUrl, postId, adminUrl, colorScheme, avatarSaturation, accentColor, commentsEnabled, title, showCount, publication};
        return options;
    }, [scriptTag]);

    const initialOptions = useMemo(() => buildOptions(), []);
    const [options, setOptions] = React.useState<CommentsOptions>(initialOptions);

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
