import {normalizeLegacyMembersFilter, translateLegacyMembersFilter} from '@src/views/members/utils/legacy-members-filter';

describe('legacy-members-filter', () => {
    it('normalizes single wrapped groups', () => {
        const normalized = normalizeLegacyMembersFilter('(email_disabled:1)');

        expect(normalized).toEqual('email_disabled:1');
    });

    it('translates legacy label filters to canonical filters', () => {
        const translated = translateLegacyMembersFilter('label:[blue-consultant]');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters).toHaveLength(1);
        expect(translated.filters[0]).toMatchObject({
            field: 'label',
            operator: 'is_any_of',
            values: ['blue-consultant']
        });
    });

    it('translates legacy subscribed expression', () => {
        const translated = translateLegacyMembersFilter('(subscribed:true+email_disabled:0)');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters).toHaveLength(1);
        expect(translated.filters[0]).toMatchObject({
            field: 'subscribed',
            operator: 'is',
            values: ['subscribed']
        });
    });

    it('translates legacy newsletter expression', () => {
        const translated = translateLegacyMembersFilter('(newsletters.slug:weekly+email_disabled:0)');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters).toHaveLength(1);
        expect(translated.filters[0]).toMatchObject({
            field: 'newsletters.weekly',
            operator: 'is',
            values: ['subscribed']
        });
    });

    it('translates legacy feedback expression', () => {
        const translated = translateLegacyMembersFilter('(feedback.post_id:\'post_1\'+feedback.score:1)');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters).toHaveLength(1);
        expect(translated.filters[0]).toMatchObject({
            field: 'newsletter_feedback',
            operator: '1',
            values: ['post_1']
        });
    });

    it('keeps additional clauses for subscribed expressions with extra clauses', () => {
        const translated = translateLegacyMembersFilter('(subscribed:false+email_disabled:0+label:[vip])');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters.some(filter => filter.field === 'label' && filter.values.includes('vip'))).toBe(true);
    });

    it('falls back for newsletter expressions without email_disabled clause', () => {
        const translated = translateLegacyMembersFilter('newsletters.slug:weekly');

        expect(translated.isComplete).toBe(false);
        expect(translated.filters).toHaveLength(0);
    });

    it('falls back for newsletter expressions with extra clauses', () => {
        const translated = translateLegacyMembersFilter('(newsletters.slug:weekly+email_disabled:0+label:[vip])');

        expect(translated.isComplete).toBe(false);
    });

    it('unescapes regex values for contains operators', () => {
        const translated = translateLegacyMembersFilter('name:~\'test+test\'');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters).toHaveLength(1);
        expect(translated.filters[0]).toMatchObject({
            field: 'name',
            operator: 'contains',
            values: ['test+test']
        });
    });

    it('unescapes regex values for does-not-contain operators', () => {
        const translated = translateLegacyMembersFilter('name:-~\'test+test\'');

        expect(translated.isComplete).toBe(true);
        expect(translated.filters).toHaveLength(1);
        expect(translated.filters[0]).toMatchObject({
            field: 'name',
            operator: 'does-not-contain',
            values: ['test+test']
        });
    });

    it('falls back for legacy date filters to preserve behavior', () => {
        const translated = translateLegacyMembersFilter('subscriptions.start_date:>\'1999-01-01 05:59:59\'');

        expect(translated.isComplete).toBe(false);
        expect(translated.filters).toHaveLength(0);
    });

    it('falls back when parsing invalid NQL', () => {
        const translated = translateLegacyMembersFilter('status:');

        expect(translated.isComplete).toBe(false);
        expect(translated.filters).toHaveLength(0);
    });
});
