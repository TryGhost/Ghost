var _       = require('lodash'),
    utils;

utils = {
    assetTemplate: _.template('<%= source %>?v=<%= version %>'),
    linkTemplate: _.template('<a href="<%= url %>"><%= text %></a>'),
    scriptTemplate: _.template('<script src="<%= source %>?v=<%= version %>"></script>'),
    inputTemplate: _.template('<input class="<%= className %>" type="<%= type %>" name="<%= name %>" <%= extras %> />'),
    isProduction: process.env.NODE_ENV === 'production',
    tagLinkTemplate: _.template('<div class="ui labeled button" tabindex="0">' +
        '<a class="ui button" href="<%= url %>"><%= name %></a>' +
        '<a class="ui teal tag label" href="<%= url %>"><%= count_posts %></a>' +
        '</div>'),
    simplePostTemplate: _.template('<div class="simple-post"><a href="<%= url %>"><%= text %></a></div>'),
    simpleImagePostTemplate: _.template('<div class="simple-image-post">' +
        '<a href="<%= url %>">' +
        '<div class="trim"><img src="<%= imagePath %>" href="<%= url %>" /></div>' +
        '<span><%= text %></span></span>' +
        '</a>' +
        '</div>'),
    // @TODO this can probably be made more generic and used in more places
    findKey: function findKey(key, object, data) {
        if (object && _.has(object, key) && !_.isEmpty(object[key])) {
            return object[key];
        }

        if (data && _.has(data, key) && !_.isEmpty(data[key])) {
            return data[key];
        }

        return null;
    },
    parseVisibility: function parseVisibility(options) {
        if (!options.hash.visibility) {
            return ['public'];
        }

        return _.map(options.hash.visibility.split(','), _.trim);
    }
};

module.exports = utils;
