import MembersActions from '@src/views/members/components/members-actions';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render} from '@testing-library/react';

const importModalPropsRef: {current: Record<string, unknown> | null} = {current: null};

vi.mock('@src/views/members/components/bulk-action-modals', () => ({
    ImportMembersModal: (props: Record<string, unknown>) => {
        importModalPropsRef.current = props;
        return React.createElement('div', {'data-testid': 'import-members-modal'});
    },
    AddLabelModal: () => React.createElement('div'),
    RemoveLabelModal: () => React.createElement('div'),
    UnsubscribeModal: () => React.createElement('div'),
    DeleteModal: () => React.createElement('div')
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
    useBrowseNewsletters: () => ({
        data: {newsletters: []},
        isLoading: false
    })
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
    useBulkEditMembers: () => ({
        mutateAsync: vi.fn(),
        isLoading: false
    }),
    useBulkDeleteMembers: () => ({
        mutate: vi.fn(),
        isLoading: false
    })
}));

describe('MembersActions', () => {
    beforeEach(() => {
        importModalPropsRef.current = null;
    });

    it('passes onImportComplete to ImportMembersModal onComplete prop', () => {
        const onImportComplete = vi.fn();

        render(
            <MembersActions
                hasFilterOrSearch={false}
                memberCount={10}
                search=""
                canBulkDelete
                onImportComplete={onImportComplete}
            />
        );

        expect(importModalPropsRef.current).not.toBeNull();
        expect(importModalPropsRef.current?.onComplete).toBe(onImportComplete);
    });
});
