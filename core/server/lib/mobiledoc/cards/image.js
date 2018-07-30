module.exports = {
    name: 'image',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        // let version = opts.options.version;
        let dom = opts.env.dom;

        if (!payload.src) {
            return '';
        }

        let figure = dom.createElement('figure');
        let figureClass = 'kg-image-card';
        if (payload.cardWidth) {
            figureClass = `${figureClass} kg-width-${payload.cardWidth}`;
        }
        figure.setAttribute('class', figureClass);

        let img = dom.createElement('img');
        img.setAttribute('src', payload.src);
        img.setAttribute('class', 'kg-image');
        if (payload.alt) {
            img.setAttribute('alt', payload.alt);
        }

        figure.appendChild(img);

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createTextNode(payload.caption));
            figure.appendChild(figcaption);
        }

        return figure;
    }
};
