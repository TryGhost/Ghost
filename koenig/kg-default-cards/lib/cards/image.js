const setSrcsetAttribute = require('../utils/set-srcset-attribute');
const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

module.exports = {
    name: 'image',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.src) {
            return dom.createTextNode('');
        }

        const figure = dom.createElement('figure');
        let figureClass = 'kg-card kg-image-card';
        if (payload.cardWidth) {
            figureClass = `${figureClass} kg-width-${payload.cardWidth}`;
        }
        figure.setAttribute('class', figureClass);

        const img = dom.createElement('img');
        img.setAttribute('src', payload.src);
        img.setAttribute('class', 'kg-image');
        img.setAttribute('alt', payload.alt || '');
        if (payload.title) {
            img.setAttribute('title', payload.title);
        }

        // TODO: add back in Ghost 4.0? Adding width/height can be a breaking change
        // for sites that don't specify a height or `height: auto` in their CSS
        // if (payload.width && payload.height) {
        //     img.setAttribute('width', payload.width);
        //     img.setAttribute('height', payload.height);
        // }

        // email clients do not have good support for srcset or sizes
        if (options.target !== 'email') {
            setSrcsetAttribute(img, payload, options);

            if (img.getAttribute('srcset') && payload.width && payload.width >= 720) {
                // standard size
                if (!payload.cardWidth) {
                    img.setAttribute('sizes', '(min-width: 720px) 720px');
                }

                if (payload.cardWidth === 'wide' && payload.width >= 1200) {
                    img.setAttribute('sizes', '(min-width: 1200px) 1200px');
                }
            }
        }

        figure.appendChild(img);

        if (payload.caption) {
            const figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    },

    absoluteToRelative(payload, options) {
        payload.src = payload.src && absoluteToRelative(payload.src, options.siteUrl, options);
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.src = payload.src && relativeToAbsolute(payload.src, options.siteUrl, options.itemUrl, options);
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
