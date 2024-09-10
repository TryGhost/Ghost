import {transformPortalAnchorToRelative} from '../../utils/transform-portal-anchor-to-relative';

// NOTE: window.location.origin = http://localhost:3000

describe('transformPortalAnchorToRelative', function () {
    test('ignores non-portal links', function () {
        const anchor = document.createElement('a');
        anchor.setAttribute('href', 'http://localhost:3000/#/signup');
        transformPortalAnchorToRelative(anchor);

        expect(anchor.getAttribute('href')).toBe('http://localhost:3000/#/signup');
    });

    test('ignores already-relative links', function () {
        const anchor = document.createElement('a');
        anchor.setAttribute('href', '#/portal/signup');
        transformPortalAnchorToRelative(anchor);

        expect(anchor.getAttribute('href')).toBe('#/portal/signup');
    });

    test('ignores external links', function () {
        const anchor = document.createElement('a');
        anchor.setAttribute('href', 'https://example.com/#/portal/signup');
        transformPortalAnchorToRelative(anchor);

        expect(anchor.getAttribute('href')).toBe('https://example.com/#/portal/signup');
    });

    test('converts absolute to a relative link', function () {
        const anchor = document.createElement('a');
        anchor.setAttribute('href', 'http://localhost:3000/#/portal/signup');
        transformPortalAnchorToRelative(anchor);

        expect(anchor.getAttribute('href')).toBe('#/portal/signup');
    });
});
