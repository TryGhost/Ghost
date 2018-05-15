module.exports = {
    name: 'code',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        let dom = opts.env.dom;

        if (!payload.code) {
            return '';
        }

        let pre = dom.createElement('pre');
        let code = dom.createElement('code');

        if (payload.language) {
            code.setAttribute('class', `language-${payload.language}`);
        }

        code.appendChild(dom.createTextNode(payload.code));
        pre.appendChild(code);

        return pre;
    }
};
