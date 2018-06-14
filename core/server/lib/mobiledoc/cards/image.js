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
        figure.setAttribute('class', 'kg-image-card');

        let img = dom.createElement('img');
        let imgClass = 'kg-image';
        if (payload.imageStyle) {
            imgClass = `${imgClass} kg-image-${payload.imageStyle}`;
        }
        img.setAttribute('src', payload.src);
        img.setAttribute('class', imgClass);

        figure.appendChild(img);

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createTextNode(payload.caption));
            figure.appendChild(figcaption);
        }

        return figure;
    }
};
