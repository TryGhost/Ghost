// # Tags Helper
// Usage: `{{newly_posts}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.

var hbs = require('express-hbs'),
    _ = require('lodash'),
    utils = require('./utils'),
    api = require('../api'),
    new_posts;

const DEFAULT_MAX = 5;
const DEFAULT_IMAGE = '/content/images/2016/05/title_logo.png';

new_posts = function(options) {
  var max = options.hash && options.hash.max ? options.hash.max : DEFAULT_MAX,
      mode = options.hash && options.hash.mode ? options.hash.mode : 0;

  return api.posts.browse({
        context: {
          internal: false
        },
        limit: String(max),
        fields: 'title,slug' + (mode !== 0 ? ',image' : '')
      }
  ).then(function(res) {
    var joined = "<div class='new-posts simple-" + (mode !== 0 ? "image-" : "") + "posts'>" +
        _.map(res.posts, function(post) {
          switch(mode) {
            case 1:
              return utils.simpleImagePostTemplate({
                url: '/' + post.slug + '/',
                imagePath: post.image || DEFAULT_IMAGE,
                text: _.escape(post.title)
              });
            default:
              return utils.simplePostTemplate({
                url: '/' + post.slug + '/',
                text: _.escape(post.title)
              });
          }
        }).join("") + "</div>";
    return new hbs.handlebars.SafeString(joined);
  });
};

module.exports = new_posts;
