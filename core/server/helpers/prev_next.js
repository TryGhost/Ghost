// ### prevNext helper exposes methods for prev_post and next_post - separately defined in helpers index.
//  Example usages
// `{{#prev_post}}<a href ="{{url}}>previous post</a>{{/prev_post}}'
// `{{#next_post}}<a href ="{{url absolute="true">next post</a>{{/next_post}}'

var api             = require('../api'),
    schema          = require('../data/schema').checks,
    Promise         = require('bluebird'),
    fetch, prevNext;

fetch = function (apiOptions, options) {
    return api.posts.read(apiOptions).then(function (result) {
        var related = result.posts[0];

        if (related.previous) {
            return options.fn(related.previous);
        } else if (related.next) {
            return options.fn(related.next);
        } else {
            return options.inverse(this);
        }
    });
};

// If prevNext method is called without valid post data then we must return a promise, if there is valid post data
// then the promise is handled in the api call.

prevNext = function (options) {
    options = options || {};

    var apiOptions = {
        include: options.name === 'prev_post' ? 'previous,previous.author,previous.tags' : 'next,next.author,next.tags'
    };

    if (schema.isPost(this) && this.status === 'published') {
        apiOptions.slug = this.slug;
        return fetch(apiOptions, options);
    } else {
        return Promise.resolve(options.inverse(this));
    }
};

module.exports = prevNext;
