import {columnAddressing, composeCodec} from './filter-addressing';
import {dateSemantics, numberSemantics, scalarSemantics, setSemantics, textSemantics} from './semantics';
import type {ValueConfig} from './semantics';
import {parseFilterToAst} from './filter-query-core';
type CodecConfig = ValueConfig & {field?: string};
const textCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), textSemantics());
const scalarCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), scalarSemantics(config));
const setCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), setSemantics(config));
const numberCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), numberSemantics());
const dateCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), dateSemantics());

import {describe, expect, it} from 'vitest';
import type {CodecContext, FilterCodec, FilterPredicate} from './filter-types';

// A filter the publisher saves has to come back meaning the same thing when the page reloads.
// Writing it and reading it back are separate pieces of code, so they can drift apart and each
// still look right on its own — that is how values ending in a dollar sign were once lost. The
// only way to catch that is to send a value out and back and check it survived, which is what
// these do, using the values most likely to break the trip.

function context(key: string, timezone = 'UTC'): CodecContext {
    return {key, pattern: key, params: {}, timezone};
}

function roundTrip(codec: FilterCodec, predicate: Omit<FilterPredicate, 'id'>, ctx: CodecContext) {
    const clauses = codec.serialize({id: 'x', ...predicate}, ctx);

    if (!clauses) {
        throw new Error(`serialize returned null for ${predicate.operator}`);
    }

    const node = parseFilterToAst(clauses.join('+'));

    if (!node) {
        throw new Error(`could not parse: ${clauses.join('+')}`);
    }

    return codec.parse(node, ctx);
}

// Chosen because they collide with the characters the text codec uses to mean something:
// `$` and `^` are how "ends with" and "starts with" are marked, so a value containing one
// is where escaping and marking have to be told apart.
const TEXT_VALUES = [
    'Ghost',
    'two words',
    '5$',
    '$5',
    '^caret',
    'a.b',
    "it's",
    'back\\slash',
    '-leading-hyphen',
    'trailing$'
];

const TEXT_OPERATORS = [
    'is',
    'is-not',
    'contains',
    'does-not-contain',
    'starts-with',
    'does-not-start-with',
    'ends-with',
    'does-not-end-with'
];

describe('codec round trips', () => {
    describe('textCodec', () => {
        const ctx = context('email');
        const codec = textCodec();

        for (const operator of TEXT_OPERATORS) {
            it.each(TEXT_VALUES)(`round-trips ${operator} %j`, (value) => {
                expect(roundTrip(codec, {field: 'email', operator, values: [value]}, ctx)).toEqual({
                    field: 'email',
                    operator,
                    values: [value]
                });
            });
        }
    });

    describe('scalarCodec', () => {
        const ctx = context('status');
        const codec = scalarCodec();

        for (const operator of ['is', 'is-not']) {
            it.each(['paid', 'two words', '-leading', "it's", 'a.b'])(`round-trips ${operator} %j`, (value) => {
                expect(roundTrip(codec, {field: 'status', operator, values: [value]}, ctx)).toEqual({
                    field: 'status',
                    operator,
                    values: [value]
                });
            });
        }
    });

    describe('setCodec', () => {
        const ctx = context('label');
        const codec = setCodec();

        for (const operator of ['is-any', 'is-not-any']) {
            it.each([
                [['vip']],
                [['vip', 'founder']],
                [['two words', 'a.b']]
            ])(`round-trips ${operator} %j`, (values) => {
                const parsed = roundTrip(codec, {field: 'label', operator, values}, ctx);

                expect(parsed?.operator).toBe(operator);
                expect(parsed?.values).toEqual([...values].sort((left, right) => left.localeCompare(right)));
            });
        }
    });

    describe('numberCodec', () => {
        const ctx = context('email_count');
        const codec = numberCodec();

        for (const operator of ['is', 'is-greater', 'is-or-greater', 'is-less', 'is-or-less']) {
            it.each([0, 1, 42])(`round-trips ${operator} %j`, (value) => {
                expect(roundTrip(codec, {field: 'email_count', operator, values: [value]}, ctx)).toEqual({
                    field: 'email_count',
                    operator,
                    values: [value]
                });
            });
        }
    });

    describe('dateCodec', () => {
        const codec = dateCodec();

        for (const timezone of ['UTC', 'Europe/Berlin', 'America/Los_Angeles']) {
            for (const operator of ['is-less', 'is-or-less', 'is-greater', 'is-or-greater']) {
                it(`round-trips ${operator} in ${timezone}`, () => {
                    const ctx = context('created_at', timezone);

                    expect(roundTrip(codec, {field: 'created_at', operator, values: ['2026-08-11']}, ctx)).toEqual({
                        field: 'created_at',
                        operator,
                        values: ['2026-08-11']
                    });
                });
            }

            for (const operator of ['in-the-last', 'in-the-next']) {
                it(`round-trips ${operator} in ${timezone}`, () => {
                    const ctx = context('created_at', timezone);

                    expect(roundTrip(codec, {field: 'created_at', operator, values: [30]}, ctx)).toEqual({
                        field: 'created_at',
                        operator,
                        values: [30]
                    });
                });
            }
        }
    });
});
