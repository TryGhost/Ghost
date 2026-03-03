import {describe, expect, it} from 'vitest';
import {getMembersNavActiveRoutes} from './nav-content.helpers';

describe('getMembersNavActiveRoutes', () => {
    it('includes members-forward route when members forward is enabled', () => {
        expect(getMembersNavActiveRoutes(true)).toEqual([
            'members-forward',
            'members',
            'member',
            'member.new'
        ]);
    });

    it('does not include members-forward route when members forward is disabled', () => {
        expect(getMembersNavActiveRoutes(false)).toEqual([
            'members',
            'member',
            'member.new'
        ]);
    });
});
