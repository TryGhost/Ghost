const createCard = require('../create-card');

module.exports = createCard({
    name: 'hr',
    type: 'dom',
    render(opts) {
        return opts.env.dom.createElement('hr');
    }
});
