import Button from '../../../../admin-x-ds/global/Button';
import React, {forwardRef, useEffect, useState} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import clsx from 'clsx';
import validator from 'validator';

export type NavigationItem = {
    label: string;
    url: string;
}

type NavigationItemEditorProps = React.HTMLAttributes<HTMLDivElement> & {
    baseUrl: string;
    item: NavigationItem;
    updateItem?: (item: Partial<NavigationItem>) => void;
    onDelete?: () => void;
    isDragging?: boolean;
    dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const formatUrl = (value: string, baseUrl: string) => {
    let url = value.trim();

    // if we have an email address, add the mailto:
    if (validator.isEmail(url)) {
        return {save: `mailto:${url}`, display: `mailto:${url}`};
    }

    const isAnchorLink = url.match(/^#/);

    if (isAnchorLink) {
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

        if (url !== '') {
            if (!url.match(/^\//)) {
                url = `/${url}`;
            }

            if (!url.match(/\/$/) && !url.match(/[.#?]/)) {
                url = `${url}/`;
            }
        }
    }

    // we update with the relative URL but then transform it back to absolute
    // for the input value. This avoids problems where the underlying relative
    // value hasn't changed even though the input value has
    if (url.match(/^(\/\/|#)/)) {
        return {save: url, display: url};
    }

    if (url.match(/^[a-zA-Z0-9-]+:/) || validator.isURL(url) || validator.isURL(`${parsedBaseUrl.origin}${url}`)) {
        return {save: url, display: new URL(url, baseUrl).toString()};
    }

    return {save: url, display: url};
};

const NavigationItemEditor = forwardRef<HTMLDivElement, NavigationItemEditorProps>(function NavigationItemEditor({baseUrl, item, updateItem, onDelete, isDragging, dragHandleProps, ...props}, ref) {
    const [urlValue, setUrlValue] = useState('');

    useEffect(() => {
        setUrlValue(formatUrl(item.url, baseUrl).display);
    }, [item.url, baseUrl]);

    const updateUrl = () => {
        const {save, display} = formatUrl(urlValue, baseUrl);

        setUrlValue(display);
        updateItem?.({url: save});
    };

    return (
        <div ref={ref} className={clsx('flex gap-4 bg-white p-2', isDragging && 'opacity-75')} {...props}>
            <button className="pl-3 pr-2" type="button" {...dragHandleProps}>
                <span className="inline-block h-3 w-3 rounded-full bg-black" />
            </button>
            <TextField value={item.label} onChange={e => updateItem?.({label: e.target.value})} />
            <TextField value={urlValue} onBlur={updateUrl} onChange={e => setUrlValue(e.target.value)} />
            <Button icon="trash" onClick={onDelete} />
        </div>
    );
});

export default NavigationItemEditor;
