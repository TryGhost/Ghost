module.exports = {
    name: 'image-card',
    type: 'dom',
    render(opts) {
        var img = opts.env.dom.createElement('img');
        img.setAttribute('src', opts.payload.img);
        return img;
    }
};
