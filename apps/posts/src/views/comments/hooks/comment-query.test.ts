import {describe, expect, it} from 'vitest';
import {buildCommentsQueryParams} from '@src/views/comments/hooks/comment-query';

describe('buildCommentsQueryParams', () => {
    it('returns shared compiled filter params for comments queries', () => {
        expect(buildCommentsQueryParams({filter: 'status:published'})).toEqual({
            filter: 'status:published'
        });
    });
});
