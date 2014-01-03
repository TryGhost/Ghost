/*globals Handlebars, moment, Ghost */
(function () {
    'use strict';
    Handlebars.registerHelper('date', function (context, options) {
        if (!options && context.hasOwnProperty('hash')) {
            options = context;
            context = undefined;

            // set to published_at by default, if it's available
            // otherwise, this will print the current date
            if (this.published_at) {
                context = this.published_at;
            }
        }

        // ensure that context is undefined, not null, as that can cause errors
        context = context === null ? undefined : context;

        var f = options.hash.format || 'MMM Do, YYYY',
            timeago = options.hash.timeago,
            date;


        if (timeago) {
            date = moment(context).fromNow();
        } else {
            date = moment(context).format(f);
        }
        return date;
    });

    Handlebars.registerHelper('adminUrl', function () {
        return Ghost.paths.subdir + '/ghost';
    });

    Handlebars.registerHelper('asset', function (context, options) {
        var output = '',
            isAdmin = options && options.hash && options.hash.ghost;

        output += Ghost.paths.subdir + '/';

        if (!context.match(/^shared/)) {
            if (isAdmin) {
                output += 'ghost/';
            } else {
                output += 'assets/';
            }
        }

        output += context;
        return new Handlebars.SafeString(output);
    });
}());
