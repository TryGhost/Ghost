const should = require('should');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const api = require('../../../../core/server/api').endpoints;
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/configUtils');
const {html} = require('common-tags');
const loggingLib = require('@tryghost/logging');

const recommendations = require('../../../../core/frontend/helpers/recommendations');
const foreach = require('../../../../core/frontend/helpers/foreach');

function trimNewLines(string) {
    return string.replace(/\n/gm, '');
}

describe('{{#recommendations}} helper', function () {
    let logging;

    before(function () {
        models.init();

        hbs.express4({
            partialsDir: [configUtils.config.get('paths').helperTemplates]
        });

        hbs.cachePartials();

        // The recommendation template expects this helper
        hbs.registerHelper('foreach', foreach);
    });

    beforeEach(function () {
        const meta = {pagination: {}};

        sinon.stub(api, 'recommendationsPublic').get(() => {
            return {
                browse: sinon.stub().resolves({recommendations: [
                    {title: 'Recommendation 1', url: 'https://recommendations1.com'},
                    {title: 'Recommendation 2', url: 'https://recommendations2.com'},
                    {title: 'Recommendation 3', url: 'https://recommendations3.com'},
                    {title: 'Recommendation 4', url: 'https://recommendations4.com'},
                    {title: 'Recommendation 5', url: 'https://recommendations5.com'}
                ], meta: meta})
            };
        });

        logging = {
            error: sinon.stub(loggingLib, 'error'),
            warn: sinon.stub(loggingLib, 'warn')
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('renders a template with recommendations', async function () {
        const response = await recommendations.call(
            'recommendations'
        );

        response.should.be.an.Object().with.property('string');

        const expected = trimNewLines(html`
            <ul class="recommendations">
            <li class="recommendation">
                <a href="https://recommendations1.com">
                    <img class="recommendation-favicon" src="" alt="Recommendation 1">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 1</h5>
                        <p class="recommendation-reason"></p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations2.com">
                    <img class="recommendation-favicon" src="" alt="Recommendation 2">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 2</h5>
                        <p class="recommendation-reason"></p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations3.com">
                    <img class="recommendation-favicon" src="" alt="Recommendation 3">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 3</h5>
                        <p class="recommendation-reason"></p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations4.com">
                    <img class="recommendation-favicon" src="" alt="Recommendation 4">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 4</h5>
                        <p class="recommendation-reason"></p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations5.com">
                    <img class="recommendation-favicon" src="" alt="Recommendation 5">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 5</h5>
                        <p class="recommendation-reason"></p>
                    </div>
                </a>
            </li>
        </ul>`);
        const actual = trimNewLines(response.string);

        actual.should.equal(expected);
    });

    describe('timeout', function () {
        beforeEach(function () {
            sinon.stub(api, 'recommendationsPublic').get(() => {
                return {
                    browse: () => {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve({recommendations: [{title: 'Recommendation 1', url: 'https://recommendations1.com'}]});
                            }, 5);
                        });
                    }
                };
            });
        });
        afterEach(async function () {
            await configUtils.restore();
        });

        it('should log an error and return safely if it hits the timeout threshold', async function () {
            configUtils.set('optimization:getHelper:timeout:threshold', 1);

            const response = await recommendations.call(
                'recommendations'
            );

            // An error message is logged
            logging.error.calledOnce.should.be.true();

            // No HTML is rendered
            response.should.be.an.Object().with.property('string');
            response.string.should.equal('');
        });
    });
});
