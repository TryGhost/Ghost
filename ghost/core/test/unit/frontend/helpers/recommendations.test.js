const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const api = require('../../../../core/server/api').endpoints;
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/config-utils');
const {html} = require('common-tags');
const loggingLib = require('@tryghost/logging');
const proxy = require('../../../../core/frontend/services/proxy');

const recommendations = require('../../../../core/frontend/helpers/recommendations');
const foreach = require('../../../../core/frontend/helpers/foreach');
const readable_url = require('../../../../core/frontend/helpers/readable_url');
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
        hbs.registerHelper('readable_url', readable_url);

        // Stub settings cache
        sinon.stub(settingsCache, 'get');
        // @ts-ignore
        settingsCache.get.withArgs('recommendations_enabled').returns(true);

        // Stub Recommendation Content API
        const meta = {pagination: {}};
        sinon.stub(api, 'recommendationsPublic').get(() => {
            return {
                browse: sinon.stub().resolves({recommendations: [
                    {id: '1', title: 'Recommendation 1', url: 'https://recommendations1.com', favicon: 'https://recommendations1.com/favicon.ico', description: 'Description 1'},
                    {id: '2', title: 'Recommendation 2', url: 'https://recommendations2.com', favicon: 'https://recommendations2.com/favicon.ico', description: 'Description 2'}
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

        const expected = html`
        <ul class="recommendations">
            <li class="recommendation">
                <a href="https://recommendations1.com" data-recommendation="1" target="_blank" rel="noopener">
                    <div class="recommendation-favicon">
                        <img src="https://recommendations1.com/favicon.ico" alt="Recommendation 1" loading="lazy" onerror="this.style.display='none';">
                    </div>
                    <h5 class="recommendation-title">Recommendation 1</h5>
                    <span class="recommendation-url">recommendations1.com</span>
                    <p class="recommendation-description">Description 1</p>
                </a>
            </li>
            <li class="recommendation">
                <a href="https://recommendations2.com" data-recommendation="2" target="_blank" rel="noopener">
                    <div class="recommendation-favicon">
                        <img src="https://recommendations2.com/favicon.ico" alt="Recommendation 2" loading="lazy" onerror="this.style.display='none';">
                    </div>
                    <h5 class="recommendation-title">Recommendation 2</h5>
                    <span class="recommendation-url">recommendations2.com</span>
                    <p class="recommendation-description">Description 2</p>
                </a>
            </li>
        </ul>
        `;

        assert(response !== null && typeof response === 'object');
        const actual = response.string;

        // Uncomment to debug
        // console.log('Expected:');
        // console.log(expected);
        // console.log('Actual:');
        // console.log(actual);

        assert.equal(trimSpaces(actual), trimSpaces(expected));
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
            assert(response !== null && typeof response === 'object');
            assert.equal(response.string, '');
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
            assert(response !== null && typeof response === 'object');
            assert.equal(response.string, '');
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
            sinon.assert.calledOnce(logging.error);

            // No HTML is rendered
            assert(response !== null && typeof response === 'object');
            assert.equal(response.string, '');
        });
    });
});
