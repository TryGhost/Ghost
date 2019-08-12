const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../server/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;

describe('Themes API', function () {
    let request;

    before(function () {
        return ghost();
    });

    before(function () {
        request = supertest.agent(config.get('url'));
        return localUtils.doAuth(request);
    });

    it('Activating a v2 theme reads in image_size settings', function () {
        return request
            .put(localUtils.API.getApiQuery('themes/test-theme/activate'))
            .set('Origin', config.get('url'))
            .expect(200)
            .then(() => {
                return testUtils.integrationTesting.urlService.waitTillFinished();
            })
            .then(() => {
                return request
                    .get(localUtils.API.getApiQuery('settings/image_sizes/'))
                    .set('Origin', config.get('url'))
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;
                should.exist(jsonResponse.settings);
                should.exist(jsonResponse.settings[0]);
                jsonResponse.settings[0].key.should.equal('image_sizes');

                const imageSizesJSON = JSON.parse(jsonResponse.settings[0].value);

                Object.keys(imageSizesJSON).length.should.equal(4);
                // core image sizes
                should.exist(imageSizesJSON.publisher_logo);
                should.exist(imageSizesJSON.amp_feature_image);

                // just loaded image sizes
                should.exist(imageSizesJSON.test_theme_s);
                should.exist(imageSizesJSON.test_theme_xs);
            });
    });
});
