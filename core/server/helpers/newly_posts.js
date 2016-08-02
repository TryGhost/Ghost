// # Tags Helper
// Usage: `{{newly_posts}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.

var hbs = require('express-hbs'),
    _ = require('lodash'),
    utils = require('./utils'),
    api = require('../api'),
    newly_posts;

const DEFAULT_MAX = 5;

newly_posts = function(options) {
  var max = options.hash && options.hash.max ? options.hash.max : DEFAULT_MAX;

  return api.posts.browse({
        context: {
          internal: false
        },
        limit: String(max),
        fields: 'title,slug'
      }
  ).then(function(res) {
    var joined = _.map(res.posts, function(post) {
      return utils.simplePostTemplate({
        url: '/' + post.slug + '/',
        text: _.escape(post.title)
      });
    }).join("");
    return new hbs.handlebars.SafeString(joined);
  });
};

module.exports = newly_posts;
