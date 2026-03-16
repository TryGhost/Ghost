import {$getNodeByKey} from 'lexical';
import {expect, vi} from 'vitest';
import {getImageDimensions} from '../../../src/utils/getImageDimensions';
import {imageUploadHandler} from '../../../src/utils/imageUploadHandler';
import type {KoenigCard} from '@tryghost/kg-default-nodes';
import type {LexicalEditor, LexicalNode} from 'lexical';

const koenigMocks = vi.hoisted(() => ({
    $isKoenigCard: vi.fn<(node: unknown) => node is KoenigCard>()
}));

vi.mock(import('lexical'), async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        $getNodeByKey: vi.fn()
    };
});

vi.mock(import('@tryghost/kg-default-nodes'), () => ({
    $isKoenigCard: koenigMocks.$isKoenigCard as unknown as (node: unknown) => node is KoenigCard
}));

vi.mock(import('../../../src/utils/getImageDimensions'), () => ({
    getImageDimensions: vi.fn()
}));

describe('imageUploadHandler', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.mocked($getNodeByKey).mockReset();
        vi.mocked(getImageDimensions).mockReset();
        koenigMocks.$isKoenigCard.mockReset();
        vi.unstubAllGlobals();
    });

    it('does not prepare or upload an image when the target is not a card', async () => {
        const node = {} as LexicalNode;
        const file = new File(['image'], 'image.png', {type: 'image/png'});
        const createObjectURL = vi.fn();
        const upload = vi.fn<(files: File[] | FileList) => Promise<{url: string}[] | null>>();
        const update = vi.fn();
        const editor = {
            getEditorState: vi.fn(() => ({
                read: vi.fn(callback => callback())
            })),
            update
        } as unknown as LexicalEditor;
        vi.mocked($getNodeByKey).mockReturnValue(node);
        koenigMocks.$isKoenigCard.mockReturnValue(false);
        vi.stubGlobal('URL', {createObjectURL});

        await imageUploadHandler([file], 'test-key', editor, upload);

        expect(koenigMocks.$isKoenigCard).toHaveBeenCalledWith(node);
        expect(createObjectURL).not.toHaveBeenCalled();
        expect(getImageDimensions).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });
});
