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
  return api.tags.browse({
    context: {
      internal: true
    },
    limit: 'all',
    include: 'post_count'
  }).then(function(res) {
    // 記事に関連するタグのみ選出
    var tags = res.tags;
    if(!all) {
      tags = _.filter(res.tags, function(tag) {
        return _.includes(tagIds, tag.id);
      });
    }
    // 降順でソート
    tags.sort(function(a, b){
      if(a.post_count < b.post_count) return 1;
      if(a.post_count > b.post_count) return -1;
      return 0;
    });
    var joined = _.map(tags, function(tag) {
      return utils.tagLinkTemplate({
        url: config.urlFor('tag', {tag: tag}),
        name: _.escape(tag.name),
        post_count: tag.post_count
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
