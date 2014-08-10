// Tiny helper allowing the use of {{gh-path}} to find ghost's root
var paths = Ember.Handlebars.makeBoundHelper(function (options) {
    var path = window.location.pathname,
        ghostRoot = path.substr(0, path.search('/ghost/')),
        adminRoot = ghostRoot + '/ghost';
    
    switch (options) {
        case 'ghost':
            return new Ember.Handlebars.SafeString(ghostRoot);
        case 'admin':
            return new Ember.Handlebars.SafeString(adminRoot);
        default:
            return new Ember.Handlebars.SafeString(ghostRoot);
    }

});

export default paths;