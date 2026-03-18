import nql from '@tryghost/nql-lang';
import {describe, expect, it} from 'vitest';
import {numberNql, scalarNql, setNql, textNql} from './filter-nql';
import type {Filter} from '@tryghost/shade';
import type {NqlContext} from './filter-types';

const statusContext: NqlContext = {
    key: 'status',
    pattern: 'status',
    params: {},
    timezone: 'UTC'
};

const emailContext: NqlContext = {
    key: 'email',
    pattern: 'email',
    params: {},
    timezone: 'UTC'
};

const authorContext: NqlContext = {
    key: 'author',
    pattern: 'author',
    params: {},
    timezone: 'UTC'
};

const bodyContext: NqlContext = {
    key: 'body',
    pattern: 'body',
    params: {},
    timezone: 'UTC'
};

const labelContext: NqlContext = {
    key: 'label',
    pattern: 'label',
    params: {},
    timezone: 'UTC'
};

const countContext: NqlContext = {
    key: 'email_count',
    pattern: 'email_count',
    params: {},
    timezone: 'UTC'
};

describe('scalarNql', () => {
    it('parses simple scalar comparisons', () => {
        expect(scalarNql().fromNql?.(nql.parse('status:paid') as never, statusContext)).toEqual({
            field: 'status',
            operator: 'is',
            values: ['paid']
        });
        expect(scalarNql().fromNql?.(nql.parse('status:-paid') as never, statusContext)).toEqual({
            field: 'status',
            operator: 'is-not',
            values: ['paid']
        });
    });

    it('serializes scalar comparisons', () => {
        const filter: Filter = {
            id: '1',
            field: 'status',
            operator: 'is-not',
            values: ['paid']
        };

        expect(scalarNql().toNql(filter, statusContext)).toEqual(['status:-paid']);
    });

    it('returns null for empty scalar values', () => {
        const filter: Filter = {
            id: '1',
            field: 'status',
            operator: 'is',
            values: []
        };

        expect(scalarNql().toNql(filter, statusContext)).toBeNull();
    });

    it('supports mapped NQL field names', () => {
        const authorNql = scalarNql({field: 'member_id'});

        expect(authorNql.fromNql?.(nql.parse('member_id:abc123') as never, authorContext)).toEqual({
            field: 'author',
            operator: 'is',
            values: ['abc123']
        });

        expect(authorNql.toNql({
            id: '1',
            field: 'author',
            operator: 'is-not',
            values: ['abc123']
        }, authorContext)).toEqual(['member_id:-abc123']);
    });

    it('supports quoted string serialization for mapped resource fields', () => {
        const emailNql = scalarNql({field: 'emails.post_id', quoteStrings: true});

        expect(emailNql.toNql({
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
        expect(scalarNql().toNql({
            id: '1',
            field: 'status',
            operator: 'is',
            values: ['-paid']
        }, statusContext)).toEqual(['status:\'-paid\'']);
    });
});

describe('textNql', () => {
    it('parses regex-based text operators', () => {
        expect(textNql().fromNql?.(nql.parse('email:~\'ghost\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'contains',
            values: ['ghost']
        });
        expect(textNql().fromNql?.(nql.parse('email:-~$\'ghost\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'does-not-end-with',
            values: ['ghost']
        });
    });

    it('preserves regex escape sequences while unescaping literal punctuation', () => {
        expect(textNql().fromNql?.(nql.parse('email:~\'g.ost\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'contains',
            values: ['g.ost']
        });

        expect(textNql().fromNql?.(nql.parse('email:~\'\\d\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'contains',
            values: ['\\d']
        });
    });

    it('parses and serializes exact text operators', () => {
        expect(textNql().fromNql?.(nql.parse('email:\'ghost@example.com\'') as never, emailContext)).toEqual({
            field: 'email',
            operator: 'is',
            values: ['ghost@example.com']
        });

        const filter: Filter = {
            id: '1',
            field: 'email',
            operator: 'is',
            values: ['ghost@example.com']
        };

        expect(textNql().toNql(filter, emailContext)).toEqual(['email:\'ghost@example.com\'']);
    });

    it('serializes canonical text operators', () => {
        const filter: Filter = {
            id: '1',
            field: 'email',
            operator: 'starts-with',
            values: ['can\'t']
        };

        expect(textNql().toNql(filter, emailContext)).toEqual(['email:~^\'can\\\'t\'']);
    });

    it('returns null for invalid text operators', () => {
        const filter: Filter = {
            id: '1',
            field: 'email',
            operator: 'is-not',
            values: ['ghost']
        };

        expect(textNql().toNql(filter, emailContext)).toBeNull();
    });

    it('serializes empty text values so URL-synced filters stay editable', () => {
        const filter: Filter = {
            id: '1',
            field: 'email',
            operator: 'is',
            values: ['']
        };

        expect(textNql().toNql(filter, emailContext)).toEqual(['email:\'\'']);
    });

    it('supports mapped NQL field names', () => {
        const bodyNql = textNql({field: 'html'});

        expect(bodyNql.fromNql?.(nql.parse('html:~\'ghost\'') as never, bodyContext)).toEqual({
            field: 'body',
            operator: 'contains',
            values: ['ghost']
        });

        expect(bodyNql.toNql({
            id: '1',
            field: 'body',
            operator: 'does-not-contain',
            values: ['ghost']
        }, bodyContext)).toEqual(['html:-~\'ghost\'']);
    });
});

describe('setNql', () => {
    it('parses set membership operators', () => {
        expect(setNql().fromNql?.(nql.parse('label:[vip,alpha]') as never, labelContext)).toEqual({
            field: 'label',
            operator: 'is-any',
            values: ['vip', 'alpha']
        });
        expect(setNql().fromNql?.(nql.parse('label:-[vip,alpha]') as never, labelContext)).toEqual({
            field: 'label',
            operator: 'is-not-any',
            values: ['vip', 'alpha']
        });
    });

    it('serializes set membership canonically', () => {
        const filter: Filter = {
            id: '1',
            field: 'label',
            operator: 'is-any',
            values: ['vip', 'alpha']
        };

        expect(setNql().toNql(filter, labelContext)).toEqual(['label:[alpha,vip]']);
    });

    it('quotes set values that contain reserved list characters', () => {
        const filter: Filter = {
            id: '1',
            field: 'label',
            operator: 'is-any',
            values: ['vip,alpha', 'beta']
        };

        expect(setNql().toNql(filter, labelContext)).toEqual(['label:[beta,\'vip,alpha\']']);
    });
});

describe('numberNql', () => {
    it('parses numeric comparison operators', () => {
        expect(numberNql().fromNql?.(nql.parse('email_count:>5') as never, countContext)).toEqual({
            field: 'email_count',
            operator: 'is-greater',
            values: [5]
        });
        expect(numberNql().fromNql?.(nql.parse('email_count:10') as never, countContext)).toEqual({
            field: 'email_count',
            operator: 'is',
            values: [10]
        });
    });

    it('serializes numeric comparison operators', () => {
        const filter: Filter = {
            id: '1',
            field: 'email_count',
            operator: 'is-or-less',
            values: [10]
        };

        expect(numberNql().toNql(filter, countContext)).toEqual(['email_count:<=10']);
    });

    it('returns null for invalid numeric values', () => {
        const filter: Filter = {
            id: '1',
            field: 'email_count',
            operator: 'is',
            values: ['ten']
        };

        expect(numberNql().toNql(filter, countContext)).toBeNull();
    });

    it('serializes numeric strings from the filter input', () => {
        const filter: Filter = {
            id: '1',
            field: 'email_count',
            operator: 'is-or-less',
            values: ['10']
        };

        expect(numberNql().toNql(filter, countContext)).toEqual(['email_count:<=10']);
    });
});
