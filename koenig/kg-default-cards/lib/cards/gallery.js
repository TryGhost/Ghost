const setSrcsetAttribute = require('../utils/set-srcset-attribute');
const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

/**
 * <figure class="kg-gallery-card kg-width-wide">
 *   <div class="kg-gallery-container>
 *      <div class="kg-gallery-row">
 *        <div class="kg-gallery-image"><img width="" height=""></div>
 *        <div class="kg-gallery-image"><img width="" height=""></div>
 *        <div class="kg-gallery-image"><img width="" height=""></div>
 *      </div>
 *      <div class="kg-gallery-row">
 *        <div class="kg-gallery-image"><img></div>
 *        <div class="kg-gallery-image"><img></div>
 *      </div>
 *   </div>
 *   <figcaption></figcaption>
 * </figure>
 */

const MAX_IMG_PER_ROW = 3;

module.exports = {
    name: 'gallery',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        let isValidImage = (image) => {
            return image.fileName
                && image.src
                && image.width
                && image.height;
        };

        let validImages = [];

        if (payload.images && payload.images.length) {
            validImages = payload.images.filter(isValidImage);
        }

        if (validImages.length === 0) {
            return dom.createTextNode('');
        }

        let figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-gallery-card kg-width-wide');

        let container = dom.createElement('div');
        container.setAttribute('class', 'kg-gallery-container');
        figure.appendChild(container);

        let buildStructure = function buildStructure(images) {
            let rows = [];
            let noOfImages = images.length;

            images.forEach((image, idx) => {
                let row = image.row;

                if (noOfImages > 1 && (noOfImages % MAX_IMG_PER_ROW === 1) && (idx === (noOfImages - 2))) {
                    row = row + 1;
                }
                if (!rows[row]) {
                    rows[row] = [];
                }

                rows[row].push(image);
            });

            return rows;
        };

        let rows = buildStructure(validImages);

        rows.forEach((row) => {
            let rowDiv = dom.createElement('div');
            rowDiv.setAttribute('class', 'kg-gallery-row');

            row.forEach((image) => {
                let imgDiv = dom.createElement('div');
                imgDiv.setAttribute('class', 'kg-gallery-image');

                let img = dom.createElement('img');
                img.setAttribute('src', image.src);
                img.setAttribute('width', image.width);
                img.setAttribute('height', image.height);
                img.setAttribute('alt', image.alt || '');
                if (image.title) {
                    img.setAttribute('title', image.title);
                }

                // email clients do not have good support for srcset or sizes
                if (options.target !== 'email') {
                    setSrcsetAttribute(img, image, options);

                    if (img.getAttribute('srcset') && image.width >= 720) {
                        if (rows.length === 1 && row.length === 1 && image.width >= 1200) {
                            img.setAttribute('sizes', '(min-width: 1200px) 1200px');
                        } else {
                            img.setAttribute('sizes', '(min-width: 720px) 720px');
                        }
                    }
                }

                imgDiv.appendChild(img);
                rowDiv.appendChild(imgDiv);
            });

            container.appendChild(rowDiv);
        });

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    },

    absoluteToRelative(payload, options) {
        if (payload.images) {
            payload.images.forEach((image) => {
                image.src = image.src && absoluteToRelative(image.src, options.siteUrl, options);
                image.caption = image.caption && htmlAbsoluteToRelative(image.caption, options.siteUrl, options);
            });
        }

        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);

        return payload;
    },

    relativeToAbsolute(payload, options) {
        if (payload.images) {
            payload.images.forEach((image) => {
                image.src = image.src && relativeToAbsolute(image.src, options.siteUrl, options.itemUrl, options);
                image.caption = image.caption && htmlRelativeToAbsolute(image.caption, options.siteUrl, options.itemUrl, options);
            });
        }

        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);

        return payload;
    }
};
