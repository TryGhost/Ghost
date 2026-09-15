import { strict as assert } from 'node:assert';


import { assertExists } from './utils/assertions.ts';
import type { Knex } from '../src/types.ts';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import config from '../src/config.ts';

describe('Config', function () {
    afterEach(function () {
        vi.restoreAllMocks();
    });

    interface MockOptions {
        firstResult?: { count?: number | string | null };
        unionResult?: unknown[];
    }

    function createMockKnex(options: MockOptions = {}): Knex & Mock {
        // Each builder call hands the chain back, the way knex does
        function returnsChain(this: unknown) {
            return chain;
        }

        const chain = {
            count: vi.fn(returnsChain),
            sum: vi.fn(returnsChain),
            where: vi.fn(returnsChain),
            first: vi.fn().mockResolvedValue(options.firstResult || {count: 0}),
            select: vi.fn(returnsChain),
            leftJoin: vi.fn(returnsChain),
            whereNot: vi.fn(returnsChain),
            andWhereNot: vi.fn(returnsChain),
            union: vi.fn().mockResolvedValue(options.unionResult || [])
        };
        return vi.fn().mockReturnValue(chain);
    }

    describe('members', function () {
        it('queries the members table and returns count', async function () {
            const knex = createMockKnex({firstResult: {count: 42}});
            const countQuery = config.members?.currentCountQuery;
            assertExists(countQuery);

            const result = await countQuery(knex);

            assert.equal(result, 42);
            expect(knex).toHaveBeenCalledWith('members');
        });
    });

    describe('newsletters', function () {
        it('queries active newsletters and returns count', async function () {
            const knex = createMockKnex({firstResult: {count: 7}});
            const countQuery = config.newsletters?.currentCountQuery;
            assertExists(countQuery);

            const result = await countQuery(knex);

            assert.equal(result, 7);
            expect(knex).toHaveBeenCalledWith('newsletters');
        });
    });

    describe('emails', function () {
        it.each([null, '500'])('preserves an aggregate returned as %s', async (count) => {
            const countQuery = config.emails?.currentCountQuery;
            assertExists(countQuery);
            assert.equal(await countQuery(createMockKnex({firstResult: {count}})), count);
        });
        it('queries emails since start date and returns sum', async function () {
            const knex = createMockKnex({firstResult: {count: 500}});
            const startDate = '2021-01-01T00:00:00Z';
            const countQuery = config.emails?.currentCountQuery;
            assertExists(countQuery);

            const result = await countQuery(knex, startDate);

            assert.equal(result, 500);
            expect(knex).toHaveBeenCalledWith('emails');
        });
    });

    describe('staff', function () {
        it('queries users with roles and invites and returns count', async function () {
            const mockResults = [{id: 1}, {id: 2}, {id: 3}];
            const knex = createMockKnex({unionResult: mockResults});
            const countQuery = config.staff?.currentCountQuery;
            assertExists(countQuery);

            const result = await countQuery(knex);

            assert.equal(result, 3);
            expect(knex).toHaveBeenCalledWith('users');
            expect(knex).toHaveBeenCalledWith('invites');
        });
    });

    describe('uploads', function () {
        it('counts nothing, because the caller supplies the size', async function () {
            const countQuery = config.uploads?.currentCountQuery;
            assertExists(countQuery);

            // The size of the file being uploaded is passed in as currentCount, so there is
            // nothing to go and count. The query exists only so the limit can be built.
            assert.equal(await countQuery(createMockKnex()), undefined);
        });

        it('reads a size in megabytes rather than bytes', function () {
            const formatter = config.uploads?.formatter;
            assertExists(formatter);

            assert.equal(formatter(5000000), '5MB');
            assert.equal(formatter(1500000), '1.5MB');
        });
    });
});
