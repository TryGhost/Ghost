'use strict';

module.exports = {
    name: 'image',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        let dom = opts.env.dom;

        let figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-image-card');

        let img = dom.createElement('img');
        let imgClass = 'kg-img';

        if (payload.imageStyle) {
            imgClass = `${imgClass} kg-img--${payload.imageStyle}`;
        }

        img.setAttribute('class', imgClass);
        img.setAttribute('src', payload.src);
        figure.appendChild(img);

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createTextNode(payload.caption));
            figure.appendChild(figcaption);
        }

        return figure;
    }
};
