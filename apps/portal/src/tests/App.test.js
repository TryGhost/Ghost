import App from '../App';
import setupGhostApi from '../utils/api';
import {appRender} from '../utils/test-utils';
import {site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';

describe('App', function () {
    beforeEach(function () {
        // Stub window.location with a URL object so we have an expected origin
        const location = new URL('http://example.com');
        delete window.location;
        window.location = location;
    });

    test('transforms portal links on render', async () => {
        const link = document.createElement('a');
        link.setAttribute('href', 'http://example.com/#/portal/signup');
        document.body.appendChild(link);

        const ghostApi = setupGhostApi({siteUrl: 'http://example.com'});
        ghostApi.init = jest.fn(() => {
            return Promise.resolve({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free
            });
        });
        const utils = appRender(
            <App api={ghostApi} />
        );

        await utils.findByTitle(/portal-popup/i);

        expect(link.getAttribute('href')).toBe('#/portal/signup');
    });
});
