import _ from 'lodash';

const tagRelation = (attrs: object) => {
  return _.pick(attrs, ['id', 'name', 'slug']);
};

module.exports.pagesTag = tagRelation;
module.exports.postsTag = tagRelation;
