module.exports = {
    name: 'card-image',
    type: 'dom',
    render(opts) {
        var img = opts.env.dom.createElement('img');
        img.className = 'kg-card-image';
        img.setAttribute('src', opts.payload.img);
        return img;
    }
};
