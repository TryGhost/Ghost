import copyTextToClipboard from '../../src/utils/copy-to-clipboard';

describe('copy-to-clipboard', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('returns true when clipboard API succeeds', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText
            }
        });

        const result = await copyTextToClipboard('hello world');

        expect(result).toBe(true);
        expect(writeText).toHaveBeenCalledWith('hello world');
    });

    test('returns false when clipboard API rejects', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('blocked'));

        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText
            }
        });

        const result = await copyTextToClipboard('hello world');

        expect(result).toBe(false);
        expect(writeText).toHaveBeenCalledWith('hello world');
    });

    test('returns false when clipboard API is unavailable', async () => {
        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: undefined
        });

        const result = await copyTextToClipboard('hello world');

        expect(result).toBe(false);
    });
});
