/**
 * EnterpriseJS Helpers
 * Please require this file in config.js
 */

var hbs = require('express-hbs');
var fs = require('fs');
var path = require('path');
var moment = require('moment');


module.exports = function () {
  var templatesPath = path.join(__dirname, 'content', 'themes', 'enterprisejs', 'templates');
  var upcomingTemplate = fs.readFileSync(path.join(templatesPath, 'upcoming-events.hbs'), 'utf8');
  var mainTemplate = fs.readFileSync(path.join(templatesPath, 'main-events.hbs'), 'utf8');

  hbs.registerHelper('formatDate', function (date, format) {
    return moment(date).format(format);
  });

  hbs.registerHelper('getEvents', function (templateName) {
    var template;
    var dataFile = path.join(__dirname, 'content', 'themes', 'enterprisejs', 'data', 'events.json');
    var data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    if (templateName === 'main') {
      template = hbs.compile(mainTemplate);
    } else {
      template = hbs.compile(upcomingTemplate);
    }

    return new hbs.handlebars.SafeString(template(data));
  });
};