const should = require('should');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const api = require('../../../../core/server/api').endpoints;
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/configUtils');
const {html} = require('common-tags');
const loggingLib = require('@tryghost/logging');
const proxy = require('../../../../core/frontend/services/proxy');

const recommendations = require('../../../../core/frontend/helpers/recommendations');
const foreach = require('../../../../core/frontend/helpers/foreach');
const {settingsCache} = proxy;

function trimSpaces(string) {
    return string.replace(/\s+/g, '');
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

        // Stub settings cache
        sinon.stub(settingsCache, 'get');
        // @ts-ignore
        settingsCache.get.withArgs('recommendations_enabled').returns(true);

        // Stub Recommendation Content API
        const meta = {pagination: {}};
        sinon.stub(api, 'recommendationsPublic').get(() => {
            return {
                browse: sinon.stub().resolves({recommendations: [
                    {title: 'Recommendation 1', url: 'https://recommendations1.com', favicon: 'https://recommendations1.com/favicon.ico', reason: 'Reason 1'},
                    {title: 'Recommendation 2', url: 'https://recommendations2.com', favicon: 'https://recommendations2.com/favicon.ico', reason: 'Reason 2'},
                    {title: 'Recommendation 3', url: 'https://recommendations3.com', favicon: 'https://recommendations3.com/favicon.ico', reason: 'Reason 3'},
                    {title: 'Recommendation 4', url: 'https://recommendations4.com', favicon: 'https://recommendations4.com/favicon.ico', reason: 'Reason 4'},
                    {title: 'Recommendation 5', url: 'https://recommendations5.com', favicon: 'https://recommendations5.com/favicon.ico', reason: 'Reason 5'}
                ], meta: meta})
            };
        });

        // Stub logging
        logging = {
            error: sinon.stub(loggingLib, 'error'),
            warn: sinon.stub(loggingLib, 'warn')
        };
    });

    after(function () {
        sinon.restore();
    });

    it('renders a template with recommendations', async function () {
        const response = await recommendations.call(
            'recommendations'
        );

        response.should.be.an.Object().with.property('string');

        const expected = trimSpaces(html`
        <ul class="recommendations">
            <li class="recommendation">
                <a href="https://recommendations1.com">
                    <img class="recommendation-favicon" src="https://recommendations1.com/favicon.ico" alt="Recommendation 1">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 1</h5>
                        <p class="recommendation-reason">Reason 1</p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations2.com">
                    <img class="recommendation-favicon" src="https://recommendations2.com/favicon.ico" alt="Recommendation 2">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 2</h5>
                        <p class="recommendation-reason">Reason 2</p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations3.com">
                    <img class="recommendation-favicon" src="https://recommendations3.com/favicon.ico" alt="Recommendation 3">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 3</h5>
                        <p class="recommendation-reason">Reason 3</p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations4.com">
                    <img class="recommendation-favicon" src="https://recommendations4.com/favicon.ico" alt="Recommendation 4">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 4</h5>
                        <p class="recommendation-reason">Reason 4</p>
                    </div>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations5.com">
                    <img class="recommendation-favicon" src="https://recommendations5.com/favicon.ico" alt="Recommendation 5">
                    <div class="recommendation-content">
                        <h5 class="recommendation-title">Recommendation 5</h5>
                        <p class="recommendation-reason">Reason 5</p>
                    </div>
                </a>
            </li>
        </ul>
        `);
        const actual = trimSpaces(response.string);

        actual.should.equal(expected);
    });

    describe('when there are no recommendations', function () {
        before(function () {
            sinon.stub(api, 'recommendationsPublic').get(() => {
                return {
                    browse: () => {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve({recommendations: []});
                            }, 5);
                        });
                    }
                };
            });
        });

        it('renders nothing', async function () {
            const response = await recommendations.call(
                'recommendations'
            );

            // No HTML is rendered
            response.should.be.an.Object().with.property('string');
            response.string.should.equal('');
        });
    });

    describe('when recommendations_enabled is false', function () {
        before(function () {
            // @ts-ignore
            settingsCache.get.withArgs('recommendations_enabled').returns(true);
        });

        it('renders nothing', async function () {
            const response = await recommendations.call(
                'recommendations'
            );

            // No HTML is rendered
            response.should.be.an.Object().with.property('string');
            response.string.should.equal('');
        });
    });

    describe('when timeout is exceeded', function () {
        before(function () {
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
        after(async function () {
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
