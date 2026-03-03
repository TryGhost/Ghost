import {describe, expect, it} from 'vitest';
import {buildExpandedPayload} from './use-navigation-preferences.helpers';

describe('buildExpandedPayload', () => {
    it('preserves existing keys and updates selected key', () => {
        expect(buildExpandedPayload({posts: false, members: true}, 'members', false)).toEqual({
            posts: false,
            members: false
        });
    });

    it('creates minimal payload when current expanded state is undefined', () => {
        expect(buildExpandedPayload(undefined, 'posts', true)).toEqual({
            posts: true
        });
    });
});
