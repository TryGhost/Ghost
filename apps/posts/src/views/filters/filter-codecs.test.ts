import nql from '@tryghost/nql-lang';
import {describe, expect, it} from 'vitest';
import {numberCodec, scalarCodec, setCodec, textCodec} from './filter-codecs';
import type {CodecContext, FilterPredicate} from './filter-types';

const statusContext: CodecContext = {
    key: 'status',
    pattern: 'status',
    params: {},
    timezone: 'UTC'
};

const emailContext: CodecContext = {
    key: 'email',
    pattern: 'email',
    params: {},
    timezone: 'UTC'
};

const authorContext: CodecContext = {
    key: 'author',
    pattern: 'author',
    params: {},
    timezone: 'UTC'
};

const bodyContext: CodecContext = {
    key: 'body',
    pattern: 'body',
    params: {},
    timezone: 'UTC'
};

const labelContext: CodecContext = {
    key: 'label',
    pattern: 'label',
    params: {},
    timezone: 'UTC'
};

const offerContext: CodecContext = {
    key: 'offer_redemptions',
    pattern: 'offer_redemptions',
    params: {},
    timezone: 'UTC'
};

const countContext: CodecContext = {
    key: 'email_count',
    pattern: 'email_count',
    params: {},
    timezone: 'UTC'
};

describe('scalarCodec', () => {
    it('parses simple scalar comparisons', () => {
        expect(scalarCodec().parse(nql.parse('status:paid') as never, statusContext)).toEqual({
            field: 'status',
            operator: 'is',
            values: ['paid']
        });
        expect(scalarCodec().parse(nql.parse('status:-paid') as never, statusContext)).toEqual({
            field: 'status',
            operator: 'is-not',
            values: ['paid']
        });
    });

    it('serializes scalar comparisons', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'status',
            operator: 'is-not',
            values: ['paid']
        };

        expect(scalarCodec().serialize(predicate, statusContext)).toEqual(['status:-paid']);
    });

    it('returns null for empty scalar values', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'status',
            operator: 'is',
            values: []
        };

        expect(scalarCodec().serialize(predicate, statusContext)).toBeNull();
    });

    it('supports mapped NQL field names', () => {
        const authorCodec = scalarCodec({field: 'member_id'});

        expect(authorCodec.parse(nql.parse('member_id:abc123') as never, authorContext)).toEqual({
            field: 'author',
            operator: 'is',
            values: ['abc123']
        });

        expect(authorCodec.serialize({
            id: '1',
            field: 'author',
            operator: 'is-not',
            values: ['abc123']
        }, authorContext)).toEqual(['member_id:-abc123']);
    });

    it('supports quoted string serialization for mapped resource fields', () => {
        const emailCodec = scalarCodec({field: 'emails.post_id', quoteStrings: true});

        expect(emailCodec.serialize({
            id: '1',
            field: 'emails.post_id',
            operator: 'is',
            values: ['post_123']
        }, {
            key: 'emails.post_id',
            pattern: 'emails.post_id',
            params: {},
            timezone: 'UTC'
        })).toEqual(['emails.post_id:\'post_123\'']);
    });

    it('quotes scalar strings with reserved NQL characters', () => {
        expect(scalarCodec().serialize({
            id: '1',
            field: 'status',
            operator: 'is',
            values: ['-paid']
        }, statusContext)).toEqual(['status:\'-paid\'']);
    });
});

describe('textCodec', () => {
    it('parses regex-based text operators', () => {
        expect(textCodec().parse(nql.parse('email:~\'ghost\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'contains',
            values: ['ghost']
        });
        expect(textCodec().parse(nql.parse('email:-~$\'ghost\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'does-not-end-with',
            values: ['ghost']
        });
    });

    it('preserves regex escape sequences while unescaping literal punctuation', () => {
        expect(textCodec().parse(nql.parse('email:~\'g.ost\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'contains',
            values: ['g.ost']
        });

        expect(textCodec().parse(nql.parse('email:~\'\\d\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'contains',
            values: ['\\d']
        });
    });

    it('parses and serializes exact text operators', () => {
        expect(textCodec().parse(nql.parse('email:\'ghost@example.com\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'is',
            values: ['ghost@example.com']
        });

        const predicate: FilterPredicate = {
            id: '1',
            field: 'email',
            operator: 'is',
            values: ['ghost@example.com']
        };

        expect(textCodec().serialize(predicate, emailContext)).toEqual(['email:\'ghost@example.com\'']);
    });

    it('serializes canonical text operators', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'email',
            operator: 'starts-with',
            values: ['can\'t']
        };

        expect(textCodec().serialize(predicate, emailContext)).toEqual(['email:~^\'can\\\'t\'']);
    });

    it('returns null for invalid text operators', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'email',
            operator: 'is-not',
            values: ['ghost']
        };

        expect(textCodec().serialize(predicate, emailContext)).toBeNull();
    });

    it('does not serialize empty text values', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'email',
            operator: 'is',
            values: ['']
        };

        expect(textCodec().serialize(predicate, emailContext)).toBeNull();
    });

    it('supports mapped NQL field names', () => {
        const bodyCodec = textCodec({field: 'html'});

        expect(bodyCodec.parse(nql.parse('html:~\'ghost\'') as never, bodyContext)).toEqual({
            field: 'body',
            operator: 'contains',
            values: ['ghost']
        });

        expect(bodyCodec.serialize({
            id: '1',
            field: 'body',
            operator: 'does-not-contain',
            values: ['ghost']
        }, bodyContext)).toEqual(['html:-~\'ghost\'']);
    });
});

describe('setCodec', () => {
    it('parses set membership operators', () => {
        expect(setCodec().parse(nql.parse('label:[vip,alpha]') as never, labelContext)).toEqual({
            field: 'label',
            operator: 'is-any',
            values: ['vip', 'alpha']
        });
        expect(setCodec().parse(nql.parse('label:-[vip,alpha]') as never, labelContext)).toEqual({
            field: 'label',
            operator: 'is-not-any',
            values: ['vip', 'alpha']
        });
    });

    it('parses singleton set values through scalar NQL operators', () => {
        expect(setCodec().parse(nql.parse('label:vip') as never, labelContext)).toEqual({
            field: 'label',
            operator: 'is-any',
            values: ['vip']
        });
        expect(setCodec().parse(nql.parse('label:-vip') as never, labelContext)).toEqual({
            field: 'label',
            operator: 'is-not-any',
            values: ['vip']
        });
    });

    it('serializes set membership canonically', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'label',
            operator: 'is-any',
            values: ['vip', 'alpha']
        };

        expect(setCodec().serialize(predicate, labelContext)).toEqual(['label:[alpha,vip]']);
    });

    it('can serialize singleton string values as quoted scalars', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'offer_redemptions',
            operator: 'is-any',
            values: ['offer_123']
        };

        expect(setCodec({quoteStrings: true, serializeSingletonAsScalar: true}).serialize(predicate, offerContext)).toEqual(['offer_redemptions:\'offer_123\'']);
    });

    it('quotes set values that contain reserved list characters', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'label',
            operator: 'is-any',
            values: ['vip,alpha', 'beta']
        };

        expect(setCodec().serialize(predicate, labelContext)).toEqual(['label:[beta,\'vip,alpha\']']);
    });
});

describe('numberCodec', () => {
    it('parses numeric comparison operators', () => {
        expect(numberCodec().parse(nql.parse('email_count:>5') as never, countContext)).toEqual({
            field: 'email_count',
            operator: 'is-greater',
            values: [5]
        });
        expect(numberCodec().parse(nql.parse('email_count:10') as never, countContext)).toEqual({
            field: 'email_count',
            operator: 'is',
            values: [10]
        });
    });

    it('serializes numeric comparison operators', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'email_count',
            operator: 'is-or-less',
            values: [10]
        };

        expect(numberCodec().serialize(predicate, countContext)).toEqual(['email_count:<=10']);
    });

    it('returns null for invalid numeric values', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'email_count',
            operator: 'is',
            values: ['ten']
        };

        expect(numberCodec().serialize(predicate, countContext)).toBeNull();
    });

    it('serializes numeric strings from the filter input', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'email_count',
            operator: 'is-or-less',
            values: ['10']
        };

        expect(numberCodec().serialize(predicate, countContext)).toEqual(['email_count:<=10']);
    });
});
