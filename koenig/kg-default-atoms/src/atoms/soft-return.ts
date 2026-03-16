module.exports = {
    name: 'soft-return',
    type: 'dom',
    render(opts) {
        return opts.env.dom.createElement('br');
    }
};
