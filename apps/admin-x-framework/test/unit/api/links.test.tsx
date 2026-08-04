import {act} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {useBulkEditLinks} from '../../../src/api/links';
import {withMockFetch} from '../../utils/mock-fetch';

const POST_ID = '1234567890abcdef12345678';

const successResponse = {
    json: {
        bulk: {
            action: 'updateLink',
            meta: {stats: {successful: 1, unsuccessful: 0}, errors: [], unsuccessfulData: []}
        }
    },
    headers: {'content-type': 'application/json'},
    ok: true,
    status: 200
};

const filterFor = async (originalUrl: string): Promise<string> => {
    let filter = '';

    await withMockFetch(successResponse, async (mock) => {
        const {result} = renderHookWithProviders(() => useBulkEditLinks());

        await act(async () => {
            await result.current.mutateAsync({
                postId: POST_ID,
                originalUrl,
                editedUrl: 'https://example.com/fixed'
            });
        });

        filter = new URL(mock.calls[0][0] as string).searchParams.get('filter') ?? '';
    });

    return filter;
};

describe('links api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('escapes the original url when building the lookup filter', async () => {
        // a trailing single quote is legal in a URL path and survives
        // `new URL()` normalisation. Unescaped it terminates the NQL string
        // literal and the whole filter fails to parse, which surfaced as an
        // edit that silently did nothing
        const originalUrl = `https://example.com/foo-bar-baz/'?ref=Test-newsletter`;

        expect(await filterFor(originalUrl)).toBe(
            String.raw`post_id:'${POST_ID}'+to:'https://example.com/foo-bar-baz/\'?ref=Test-newsletter'`
        );
    });

    it('leaves urls without quotes untouched', async () => {
        expect(await filterFor('https://example.com/plain')).toBe(
            `post_id:'${POST_ID}'+to:'https://example.com/plain'`
        );
    });

    it('escapes every quote rather than only the first', async () => {
        expect(await filterFor(`https://example.com/a'b'c`)).toBe(
            String.raw`post_id:'${POST_ID}'+to:'https://example.com/a\'b\'c'`
        );
    });

    it('does not let a crafted url break out into extra conditions', async () => {
        expect(await filterFor(`https://example.com/x',foo:1`)).toBe(
            String.raw`post_id:'${POST_ID}'+to:'https://example.com/x\',foo:1'`
        );
    });

    it('does not double backslashes', async () => {
        // NQL keeps lone backslashes literal and only unescapes \' and \",
        // so doubling would query a different url
        expect(await filterFor('https://example.com/trailing\\')).toBe(
            String.raw`post_id:'${POST_ID}'+to:'https://example.com/trailing\'`
        );
    });
});
