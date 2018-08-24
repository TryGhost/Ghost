var should = require('should'),
    hbs = require('../../../../server/services/themes/engine'),
    configUtils = require('../../../utils/configUtils'),
    // Stuff we are testing
    subscribe_form = require('../../../../server/apps/subscribers/lib/helpers/subscribe_form');

describe('{{subscribe_form}} helper', function () {
    before(function (done) {
        hbs.express3({partialsDir: [configUtils.config.get('paths').helperTemplates]});
        hbs.cachePartials(function () {
            done();
        });

        hbs.registerHelper('subscribe_form', subscribe_form);
    });

    after(function () {
        // @NOTE: We have to deregister the new helper, otherwise we operate on the global hbs engine
        //        which has registered the subscribe form helper. This is caused by the theme engine creating
        //        a global hbs instance as soon as you require the file.
        hbs.handlebars.unregisterHelper('subscribe_form');
    });

    it('returns a form with basic expected structure', function () {
        var rendered = subscribe_form({data: {root: ''}, hash: {}});
        should.exist(rendered);

        should.exist(rendered);
        rendered.string.should.match(/form method="post" action="\/subscribe\/"/);
        rendered.string.should.match(/button id="" class="" type="submit"/);
    });

    it('returns adds classes when passed as parameters', function () {
        var rendered = subscribe_form({data: {root: ''}, hash: {
            form_class: 'form-class',
            button_class: 'button-class'
        }});
        should.exist(rendered);

        should.exist(rendered);
        rendered.string.should.match(/form method="post" action="\/subscribe\/" id="" class="form-class"/);
        rendered.string.should.match(/button id="" class="button-class" type="submit"/);
    });

    it('returns adds classes when passed as parameters', function () {
        var rendered = subscribe_form({data: {root: ''}, hash: {
            form_id: 'form-id',
            button_id: 'button-id'
        }});
        should.exist(rendered);

        should.exist(rendered);
        rendered.string.should.match(/form method="post" action="\/subscribe\/" id="form-id" class=""/);
        rendered.string.should.match(/button id="button-id" class="" type="submit"/);
    });
});
