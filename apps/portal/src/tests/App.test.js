import App from '../App';
import setupGhostApi from '../utils/api';
import {appRender} from '../utils/test-utils';
import {site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
import i18n from '../utils/i18n';
import {vi} from 'vitest';

vi.mock('../utils/i18n', () => ({
    default: {
        changeLanguage: vi.fn(),
        dir: vi.fn(),
        t: vi.fn(str => str)
    },
    t: vi.fn(str => str)
}));

describe('App', function () {
    beforeEach(function () {
        // Stub window.location with a URL object so we have an expected origin
        const location = new URL('http://example.com');
        delete window.location;
        window.location = location;
    });

    function setupApi({site = {}, member = {}} = {}) {
        const defaultSite = FixtureSite.singleTier.basic;
        const defaultMember = FixtureMember.free;

        const siteFixtures = {
            ...defaultSite,
            ...site
        };

        const memberFixtures = {
            ...defaultMember,
            ...member
        };

        const ghostApi = setupGhostApi({siteUrl: 'http://example.com'});
        ghostApi.init = vi.fn(() => {
            return Promise.resolve({
                site: siteFixtures,
                member: memberFixtures
            });
        });

        return ghostApi;
    }

    test('transforms portal links on render', async () => {
        const link = document.createElement('a');
        link.setAttribute('href', 'http://example.com/#/portal/signup');
        document.body.appendChild(link);

        const ghostApi = setupApi();
        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} />
        );

        await utils.findByTitle(/portal-popup/i);

        expect(link.getAttribute('href')).toBe('#/portal/signup');
    });

    test('prefers locale prop over site locale for i18n language', async () => {
        const ghostApi = setupApi({
            site: {
                locale: 'de'
            }
        });

        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} locale="en" />
        );

        await utils.findByTitle(/portal-popup/i);

        i18n.changeLanguage.mock.calls.forEach((call) => {
            expect(call[0]).toBe('en');
        });
    });
});
