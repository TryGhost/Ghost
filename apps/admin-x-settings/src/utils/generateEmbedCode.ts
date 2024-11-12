import {escapeHtml} from './escapeHtml';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
export type GenerateCodeOptions = {
    preview: boolean;
    config: {
        blogUrl: string;
        signupForm: {
            url: string;
            version: string;
        };
    };
    settings: {
        accentColor: string;
        icon?: string;
        title?: string;
        description?: string;
        locale?: string;
    };
    labels: Array<{ name: string }>;
    backgroundColor: string;
    layout: string;
    i18nEnabled: boolean;
};

type OptionsType = {
    site: string;
    'button-color': string;
    'button-text-color': string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // This allows for computed properties like 'label-1', 'label-2', etc.
};

export const generateCode = ({
    preview,
    config,
    settings,
    labels,
    backgroundColor,
    layout,
    i18nEnabled
}: GenerateCodeOptions) => {
    const siteUrl = config.blogUrl;
    const scriptUrl = config.signupForm.url.replace('{version}', config.signupForm.version);

    let options: OptionsType = {
        site: siteUrl,
        'button-color': settings.accentColor,
        'button-text-color': textColorForBackgroundColor(settings.accentColor).hex()
    };

    if (i18nEnabled && settings.locale) {
        options.locale = settings.locale;
    }

    for (const [i, label] of labels.entries()) {
        options[`label-${i + 1}`] = label.name;
    }

    let style = 'min-height: 58px;max-width: 440px;margin: 0 auto;width: 100%';

    if (layout === 'all-in-one') {
        if (settings.icon && settings.icon !== '') {
            options.icon = settings.icon.replace(/\/content\/images\//, '/content/images/size/w192h192/');
        }
        options.title = settings.title;
        options.description = settings.description;
        options['background-color'] = backgroundColor;
        options['text-color'] = textColorForBackgroundColor(backgroundColor).hex();

        style = 'height: 40vmin;min-height: 360px';
    }

    if (preview) {
        if (layout === 'minimal') {
            style = 'min-height: 58px; max-width: 440px;width: 100%;position: absolute; left: 50%; top:50%; transform: translate(-50%, -50%);';
        } else {
            style = 'height: 100vh';
        }
    }

    let dataOptionsString = '';
    const preferredOrder = [
        'background-color',
        'text-color',
        'button-color',
        'button-text-color',
        'title',
        'description',
        'icon',
        'site',
        'locale'
    ];
    const sortedKeys = Object.keys(options).sort((a, b) => {
        return preferredOrder.indexOf(a) - preferredOrder.indexOf(b);
    });
    for (const key of sortedKeys) {
        const value = options[key];
        dataOptionsString += ` data-${key}="${escapeHtml(value)}"`;
    }

    const code = `<div style="${escapeHtml(style)}"><script src="${encodeURI(scriptUrl)}"${dataOptionsString} async></script></div>`;

    if (preview && layout === 'minimal') {
        return `<div style="position: absolute; z-index: -1; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%);background-size: 16px 16px;background-position: 0 0, 8px 8px;;"></div>${code}`;
    }

    return code;
};
