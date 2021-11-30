module.exports = {
    render({payload, env: {dom}, options = {}}) {
        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card');

        let html = payload.html;

        if (options.target === 'email') {
            html = `${html}`;
        }

        figure.appendChild(dom.createRawHTMLSection(html));

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    }
};

