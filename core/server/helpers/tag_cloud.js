/**
 * Created by wilson on 14/11/26.
 */
// # Tag cloud helper
// Usage: `{{tag_cloud limit="5"}}`
// Defaults to limit="5"

var Promise         = require('bluebird'),
    _               = require('lodash'),
    hbs             = require('express-hbs'),
    config          = require('../config'),
    api             = require('../api'),
    dataProvider    = require('../models'),
    tag_cloud;

// var linkTemplate = _.template('<a href="<%= url %>" class="tag-item"><%= text %><span class="post-count"><%= count %></span></a>');
var linkTemplate = _.template('<li class="drawer-list-item"><a href="<%= url %>"><i class="fa fa-list-alt"></i><%= text %><span class="badge"><%= count %></span></a></li>');

tag_cloud = function (options) {
    var limit = (options && options.hash.limit) || 'all';

    if(limit !== 'all') {
        limit = parseInt(limit, 10) || 5;
    }

    var collection = dataProvider.Tags.forge();

    return collection.query(function(qb) {
        qb.select()
            .count('tags.id as post_count')
            .from('tags')
            .innerJoin('posts_tags', 'tags.id', '=', 'posts_tags.tag_id')
            .groupBy('tags.name')
            .orderBy('post_count', 'desc');

        if(_.isNumber(limit)) {
            qb.limit(limit);
        }
    }).fetch().then(function(collection) {
        var tags = collection.toJSON();

        var output = _.map(tags, function (tag) {
            return linkTemplate({
                url: config.urlFor('tag', {tag: tag}),
                text: _.escape(tag.name),
                count: tag.post_count
            });
        }).join('');
//        return output;
        return new hbs.handlebars.SafeString(output);
    });
};

module.exports = tag_cloud;
