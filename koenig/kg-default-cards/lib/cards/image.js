'use strict';

module.exports = {
    name: 'image',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        let dom = opts.env.dom;
        let figure = dom.createElement('figure');

        let img = dom.createElement('img');
        img.className = 'kg-card-image';
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
