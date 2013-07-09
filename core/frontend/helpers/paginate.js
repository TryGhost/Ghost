var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    handlebars = require('express-hbs').handlebars,
    nodefn = require('when/node/function'),

    PaginationHelper;

PaginationHelper = function (paginationTemplate) {
    // Bind the context for our methods.
    _.bindAll(this, 'compileTemplate', 'renderPagination');

    if (_.isFunction(paginationTemplate)) {
        this.paginationTemplateFunc = paginationTemplate;
    } else {
        this.paginationTemplatePath = paginationTemplate;
    }
};

PaginationHelper.prototype.compileTemplate = function (templatePath) {
    var self = this;

    // Allow people to overwrite the paginationTemplatePath
    templatePath = templatePath || this.paginationTemplatePath;

    return nodefn.call(fs.readFile, templatePath).then(function (paginationContents) {
        // TODO: Can handlebars compile async?
        self.paginationTemplateFunc = handlebars.compile(paginationContents.toString());
    });
};

PaginationHelper.prototype.renderPagination = function (context) {
    return new handlebars.SafeString(this.paginationTemplateFunc(context));
};

PaginationHelper.registerWithGhost = function (ghost) {
    var templatePath = path.join(ghost.paths().frontendViews, 'pagination.hbs'),
        paginationHelper = new PaginationHelper(templatePath);

    return paginationHelper.compileTemplate().then(function () {
        ghost.registerThemeHelper("paginate", paginationHelper.renderPagination);
    });
};

module.exports = PaginationHelper;