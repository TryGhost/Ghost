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

const createCard = require('../create-card');

const MAX_IMG_PER_ROW = 3;

module.exports = createCard({
    name: 'gallery',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        // let version = opts.options.version;
        let dom = opts.env.dom;

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
            return '';
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

                if (image.alt) {
                    img.setAttribute('alt', image.alt);
                }
                if (image.title) {
                    img.setAttribute('title', image.title);
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
    }
});
