const _ = require('lodash');

const tagRelation = (attrs) => {
    return _.pick(attrs, [
        'id',
        'name',
        'slug'
    ]);
};

module.exports.pagesTag = tagRelation;
module.exports.postsTag = tagRelation;
