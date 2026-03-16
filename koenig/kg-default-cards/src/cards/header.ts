import {
    absoluteToRelative,
    htmlAbsoluteToRelative,
    relativeToAbsolute,
    htmlRelativeToAbsolute,
    toTransformReady,
    htmlToTransformReady
} from '@tryghost/url-utils/lib/utils';
import {
    slugify
} from '@tryghost/kg-utils';
import {
    hbs,
    dedent
} from '../utils/index.js';
import type {Card} from '../types.js';

interface HeaderPayload {
    header?: string;
    subheader?: string;
    buttonEnabled?: boolean;
    buttonUrl?: string;
    buttonText?: string;
    size?: string;
    style?: string;
    backgroundImageSrc?: string;
}

const headerCard: Card = {
    name: 'header',
    type: 'dom',

    render({payload: _payload, env: {dom}, options: {ghostVersion} = {}}) {
        const payload = _payload as HeaderPayload;
        if (!payload.header && !payload.subheader && (!payload.buttonEnabled || (!payload.buttonUrl || !payload.buttonText))) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
            <div class="kg-card kg-header-card kg-width-full kg-size-{{size}} kg-style-{{style}}" style="{{backgroundImageStyle}}" data-kg-background-image="{{backgroundImageSrc}}">
                {{#if this.hasHeader}}
                    <h2 class="kg-header-card-header" id="{{headerSlug}}">{{{header}}}</h2>
                {{/if}}
                {{#if this.hasSubheader}}
                    <h3 class="kg-header-card-subheader" id="{{subheaderSlug}}">{{{subheader}}}</h3>
                {{/if}}
                {{#if buttonEnabled}}
                    <a href="{{buttonUrl}}" class="kg-header-card-button">
                        {{buttonText}}
                    </a>
                {{/if}}
            </div>
        `;

        const templateData = {
            size: payload.size,
            style: payload.style,
            buttonEnabled: payload.buttonEnabled && Boolean(payload.buttonUrl) && Boolean(payload.buttonText),
            buttonUrl: payload.buttonUrl,
            buttonText: payload.buttonText,
            header: payload.header,
            headerSlug: slugify(payload.header || '', {ghostVersion}),
            subheader: payload.subheader,
            subheaderSlug: slugify(payload.subheader || '', {ghostVersion}),
            hasHeader: payload.header && true,
            hasSubheader: payload.subheader && Boolean(payload.subheader.replace(/(<br>)+$/g, '').trim()),
            backgroundImageStyle: payload.style === 'image' ? `background-image: url(${payload.backgroundImageSrc})` : '',
            backgroundImageSrc: payload.backgroundImageSrc
        };

        const html = dedent(frontendTemplate(templateData));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        const p = payload as HeaderPayload;
        p.buttonUrl = p.buttonUrl && absoluteToRelative(p.buttonUrl, options.siteUrl, options);
        p.backgroundImageSrc = p.backgroundImageSrc && absoluteToRelative(p.backgroundImageSrc, options.siteUrl, options);

        p.header = p.header && htmlAbsoluteToRelative(p.header, options.siteUrl, options);
        p.subheader = p.subheader && htmlAbsoluteToRelative(p.subheader, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        const p = payload as HeaderPayload;
        p.buttonUrl = p.buttonUrl && relativeToAbsolute(p.buttonUrl, options.siteUrl, options.itemUrl ?? '', options);
        p.backgroundImageSrc = p.backgroundImageSrc && relativeToAbsolute(p.backgroundImageSrc, options.siteUrl, options.itemUrl ?? '', options);

        p.header = p.header && htmlRelativeToAbsolute(p.header, options.siteUrl, options.itemUrl ?? '', options);
        p.subheader = p.subheader && htmlRelativeToAbsolute(p.subheader, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        const p = payload as HeaderPayload;
        p.buttonUrl = p.buttonUrl && toTransformReady(p.buttonUrl, options.siteUrl, options.itemUrl ?? '', options);
        p.backgroundImageSrc = p.backgroundImageSrc && toTransformReady(p.backgroundImageSrc, options.siteUrl, options.itemUrl ?? '', options);

        p.header = p.header && htmlToTransformReady(p.header, options.siteUrl, options.itemUrl ?? '', options);
        p.subheader = p.subheader && htmlToTransformReady(p.subheader, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    }
};

export default headerCard;
