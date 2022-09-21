const elementTransformers = [
    require('./element/paragraph'),
    require('./element/heading'),
    require('./element/list'),
    require('./element/hr'),
    require('./element/blockquote'),
    require('./element/aside')
];

module.exports = {
    elementTransformers
};
