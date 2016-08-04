// var should         = require('should'),
//     hbs            = require('express-hbs'),
//     ampApp         = require('../../amp').activate,
//
// // Stuff we are testing
//     handlebars          = hbs.handlebars,
//     ampContentHelper    = require('../lib/helpers/amp_content');
//
// describe('{{amp_content}} helper', function () {
//     // before(function () {
//     //     ampApp();
//     // });
//
//     it('has loaded content helper', function () {
//         console.log('heampContentHelperlpers:', ampContentHelper);
//         console.log(handlebars.helpers);
//         should.exist(handlebars.helpers.ampContentHelper);
//     });
//
//     it('can render content', function () {
//         var html = 'Hello World',
//             rendered = ampContentHelper.call({html: html});
//
//         should.exist(rendered);
//         rendered.string.should.equal(html);
//     });
// });
