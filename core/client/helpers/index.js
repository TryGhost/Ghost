/*globals Handlebars, moment
*/
(function () {
    "use strict";
    Handlebars.registerHelper('date', function (context, block) {
        var f = block.hash.format || "MMM Do, YYYY",
            timeago = block.hash.timeago,
            date;
        if (timeago) {
            date = moment(context).fromNow();
        } else {
            date = moment(context).format(f);
        }
        return date;
    });
}());
