import {$getNodeByKey} from 'lexical';
import {expect, vi} from 'vitest';
import {getImageDimensions} from '../../../src/utils/getImageDimensions';
import {imageUploadHandler} from '../../../src/utils/imageUploadHandler';

const koenigMocks = vi.hoisted(() => ({
    $isKoenigCard: vi.fn()
}));

vi.mock(import('lexical'), async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        $getNodeByKey: vi.fn()
    };
});

vi.mock(import('@tryghost/kg-default-nodes'), () => ({
    $isKoenigCard: koenigMocks.$isKoenigCard
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
        const node = {};
        const createObjectURL = vi.fn();
        const upload = vi.fn();
        const update = vi.fn();
        const editor = {
            getEditorState: vi.fn(() => ({
                read: vi.fn(callback => callback())
            })),
            update
        };
        vi.mocked($getNodeByKey).mockReturnValue(node);
        koenigMocks.$isKoenigCard.mockReturnValue(false);
        vi.stubGlobal('URL', {createObjectURL});

        await imageUploadHandler([{}], 'test-key', editor, upload);

        expect(koenigMocks.$isKoenigCard).toHaveBeenCalledWith(node);
        expect(createObjectURL).not.toHaveBeenCalled();
        expect(getImageDimensions).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });
});
