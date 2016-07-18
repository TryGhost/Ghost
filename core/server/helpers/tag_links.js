// # Tags Helper
// Usage: `{{tag_links}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.

var hbs    = require('express-hbs'),
    _      = require('lodash'),
    config = require('../config'),
    utils  = require('./utils'),
    api    = require('../api'),
    tag_links,
    tagLinks;

tag_links = function(options) {
  var tagIds = _.map(this.tags, 'id'),
  // 全件表示するかどうか
      all = options.hash && options.hash.all ? options.hash.all : false;
  var query = {
    context: {
      internal: true
    },
    limit: 'all',
    include: 'count.posts'
  };
  if(!all) {
    if(_.isEmpty(tagIds)) {
      query.limit = '1';
    } else {
      query.filter = tagIds.map(function(id) {
        return 'id:' + id;
      }).join(',');
    }
  }
  return api.tags.browse(query).then(function(res) {
    if(_.isEmpty(tagIds)) {
      return new hbs.handlebars.SafeString("");
    }
    // 記事に関連するタグのみ選出
    var tags = res.tags;
    // 降順でソート
    tags.sort(function(a, b){
      if(a.count.posts < b.count.posts) return 1;
      if(a.count.posts > b.count.posts) return -1;
      return 0;
    });
    var joined = tags.map(function(tag) {
      return utils.tagLinkTemplate({
        url: config.urlFor('tag', {tag: tag}),
        name: _.escape(tag.name),
        count_posts: tag.count.posts
      });
    }).join("");
    return new hbs.handlebars.SafeString(joined);
  });
};

tagLinks = function(options) {
  errors.logWarn('Warning: tagLinks is deprecated, please use tag_links instead\n' +
      'The helper tagLinks has been replaced with tag_links in Ghost 0.4.2, and will be removed entirely in Ghost 0.6\n' +
      'In your theme\'s pagination.hbs file, tagLinks should be renamed to tag_links');

  /*jshint unused:false*/
  var self = this;

  return tag_links.call(self, options);
};

module.exports = tag_links;
module.exports.deprecated = tagLinks;
