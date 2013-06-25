var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    handlebars = require('express-hbs').handlebars,
    nodefn = require('when/node/function'),
    NavHelper;

NavHelper = function (navTemplate) {
    // Bind the context for our methods.
    _.bindAll(this, 'compileTemplate', 'renderNavItems');

    if (_.isFunction(navTemplate)) {
        this.navTemplateFunc = navTemplate;
    } else {
        this.navTemplatePath = navTemplate;
    }
};

NavHelper.prototype.compileTemplate = function (templatePath) {
    var self = this;

    // Allow people to overwrite the navTemplatePath
    templatePath = templatePath || this.navTemplatePath;

    return nodefn.call(fs.readFile, templatePath).then(function (navTemplateContents) {
        // TODO: Can handlebars compile async?
        self.navTemplateFunc = handlebars.compile(navTemplateContents.toString());
    });
};

NavHelper.prototype.renderNavItems = function (navItems) {
    var output;

    output = this.navTemplateFunc({links: navItems});

    return output;
};

// A static helper method for registering with ghost
NavHelper.registerWithGhost = function (ghost) {
    var templatePath = path.join(ghost.paths().frontendViews, 'nav.hbs'),
        ghostNavHelper = new NavHelper(templatePath);

    return ghostNavHelper.compileTemplate().then(function () {
        ghost.registerThemeHelper("nav", ghostNavHelper.renderNavItems);
    });
};

module.exports = NavHelper;