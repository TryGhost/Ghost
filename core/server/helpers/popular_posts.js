// # Tags Helper
// Usage: `{{popular_posts}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.

var hbs         = require('express-hbs'),
    _           = require('lodash'),
    utils       = require('./utils'),
    api         = require('../api'),
    MongoClient = require('mongodb').MongoClient,
    assert      = require('assert'),
    db,
    col,
    popular_posts;

const MONGO_URL = 'mongodb://localhost:27017/maytry_analytics';
const DEFAULT_MAX = 5;
const DEFAULT_PERIOD = 'week';
const DEFAULT_IMAGE = '/content/images/2016/05/title_logo.png';

MongoClient.connect(MONGO_URL, function(err, _db) {
  assert.equal(null, err);
  col = _db.collection('access_ranking');
  db = _db;
});

popular_posts = function(options) {
  var contentInfos,
      max = options.hash && options.hash.max ? options.hash.max : DEFAULT_MAX,
      period = options.hash && options.hash.period ? options.hash.period : DEFAULT_PERIOD,
      all = options.hash && options.hash.all ? options.hash.all : false,
      mode = options.hash && options.hash.mode ? options.hash.mode : 0;

  var cursor = col.find({'query.period': period});
  return cursor.next().then(function(res) {
    contentInfos = res.rows.slice(0, Math.min(max, res.rows.length));
    // db.close();
    return api.posts.browse({
          context: {
            internal: false
          },
          limit: 'all',
          filter: contentInfos.map(function(info) {
            return 'slug:' + info[0].substr(1, info[0].length - 2);
          }).join(','),
          fields: 'title,slug' + (mode !== 0 ? ',image' : '')
        }
    )
  }).then(function(res) {
    var posts = contentInfos.map(function(info) {
      return res.posts.filter(function(post) {
        return '/' + post.slug + '/' === info[0];
      })[0];
    });
    var joined = "<div class='popular-posts simple-" + (mode !== 0 ? "image-" : "") + "posts'>" +
        _.map(posts, function(post) {
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

module.exports = popular_posts;
