var _       = require('lodash'),
    utils;

utils = {
    assetTemplate: _.template('<%= source %>?v=<%= version %>'),
    linkTemplate: _.template('<a href="<%= url %>"><%= text %></a>'),
    scriptTemplate: _.template('<script src="<%= source %>?v=<%= version %>"></script>'),
    inputTemplate: _.template('<input class="<%= className %>" type="<%= type %>" name="<%= name %>" <%= extras %> />'),
    isProduction: process.env.NODE_ENV === 'production'
};

module.exports = utils;
