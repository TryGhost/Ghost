// # Tags Helper
// Usage: `{{tag_links}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.

var hbs = require('express-hbs'),
    _ = require('lodash'),
    config = require('../config'),
    utils = require('./utils'),
    api = require('../api'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    db,
    col,
    popular_posts,
    popContents;

const MONGO_URL = 'mongodb://localhost:27017/maytry_analytics';
const DEFAULT_MAX = 5;
const DEFAULT_PERIOD = 'week';

MongoClient.connect(MONGO_URL, function(err, _db) {
  assert.equal(null, err);
  col = _db.collection('access_ranking');
  db = _db;
});

popular_posts = function(options) {
  var contentInfos,
      max = options.hash && options.hash.max ? options.hash.max : DEFAULT_MAX,
      period = options.hash && options.hash.period ? options.hash.period : DEFAULT_PERIOD,
      all = options.hash && options.hash.all ? options.hash.all : false;

  var cursor = col.find({'query.period': period});
  return cursor.next().then(function(res) {
    contentInfos = res.rows.slice(0, Math.min(max, res.rows.length));
    db.close();
    return api.posts.browse({
          context: {
            internal: true
          },
          limit: 'all',
          filter: contentInfos.map(function(info) {
            return 'slug:' + info[0].substr(1, info[0].length - 2);
          }).join(','),
          fields: 'title,slug'
        }
    )
  }).then(function(res) {
    var posts = contentInfos.map(function(info) {
      return res.posts.filter(function(post) {
        return '/' + post.slug + '/' === info[0];
      })[0];
    });
    var joined = _.map(posts, function(post) {
      return utils.popularPostTemplate({
        url: '/' + post.slug + '/',
        text: _.escape(post.title)
      });
    }).join("");
    return new hbs.handlebars.SafeString(joined);
  });
};

popContents = function(options) {
  errors.logWarn('');

  /*jshint unused:false*/
  var self = this;

  return popular_posts.call(self, options);
};

module.exports = popular_posts;
module.exports.deprecated = popContents;
