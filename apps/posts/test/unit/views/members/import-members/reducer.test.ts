import {createInitialImportState, importReducer} from '@src/views/members/components/bulk-action-modals/import-members/reducer';
import {describe, expect, it} from 'vitest';

describe('importReducer', () => {
    it('selects a file and enters mapping state', () => {
        const file = {name: 'members.csv'} as File;
        const next = importReducer(createInitialImportState(), {
            type: 'SELECT_FILE',
            file
        });

        expect(next.status).toBe('MAPPING');
        expect(next.file).toEqual(file);
        expect(next.fileError).toBeNull();
    });

    it('transitions to uploading state', () => {
        const next = importReducer(createInitialImportState(), {type: 'UPLOAD_START'});

        expect(next.status).toBe('UPLOADING');
        expect(next.showMappingErrors).toBe(false);
    });

    it('transitions to processing state for accepted async import', () => {
        const next = importReducer(createInitialImportState(), {type: 'UPLOAD_ACCEPTED'});

        expect(next.status).toBe('PROCESSING');
    });

    it('resets to the initial state', () => {
        const selected = importReducer(createInitialImportState(), {
            type: 'SELECT_FILE',
            file: {name: 'members.csv'} as File
        });
        const reset = importReducer(selected, {type: 'RESET'});

        expect(reset).toEqual(createInitialImportState());
    });
});
