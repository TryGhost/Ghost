import {describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useMembersFilterConfig} from '@src/views/members/hooks/use-members-filter-config';

describe('useMembersFilterConfig', () => {
    it('exposes include and exclude operators for the label filter', () => {
        const {result} = renderHook(() => useMembersFilterConfig({
            labelsOptions: [
                {value: 'vip', label: 'VIP'}
            ]
        }));

        const labelField = result.current
            .flatMap(group => group.fields)
            .find(field => field.key === 'label');

        expect(labelField?.operators).toEqual([
            {value: 'is_any_of', label: 'is any of'},
            {value: 'is_not_any_of', label: 'is none of'}
        ]);
    });
});
