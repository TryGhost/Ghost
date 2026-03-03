import {getRouteForContext} from '@src/components/settings/email/verified-email-verify-routes';

describe('getRouteForContext', function () {
    it('returns customization newsletter route when verification came from customization', function () {
        expect(getRouteForContext({
            type: 'newsletter',
            id: 'newsletter-1',
            source: 'email_customization'
        })).toBe('newsletters/customize/newsletter/newsletter-1');
    });

    it('returns customization automation route when verification came from customization', function () {
        expect(getRouteForContext({
            type: 'automated_email',
            id: 'automation-1',
            source: 'email_customization'
        })).toBe('newsletters/customize/automation/automation-1');
    });

    it('returns newsletter detail route for non-customization newsletter context', function () {
        expect(getRouteForContext({
            type: 'newsletter',
            id: 'newsletter-1'
        })).toBe('newsletters/newsletter-1');
    });

    it('returns portal route for members support setting context', function () {
        expect(getRouteForContext({
            type: 'setting',
            key: 'members_support_address'
        })).toBe('portal/edit');
    });

    it('returns empty route when context is unsupported', function () {
        expect(getRouteForContext({
            type: 'setting',
            key: 'default_email_address'
        })).toBe('');
    });
});
