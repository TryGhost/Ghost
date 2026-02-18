import copyTextToClipboard from '../../src/utils/copy-to-clipboard';

describe('copy-to-clipboard', () => {
    beforeEach(() => {
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: vi.fn()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('uses clipboard API when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText
            }
        });

        const execCommandSpy = vi.spyOn(document, 'execCommand');

        const result = await copyTextToClipboard('hello world');

        expect(result).toBe(true);
        expect(writeText).toHaveBeenCalledWith('hello world');
        expect(execCommandSpy).not.toHaveBeenCalled();
    });

    test('falls back to document.execCommand when clipboard API is unavailable', async () => {
        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: undefined
        });

        const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);

        const result = await copyTextToClipboard('fallback text');

        expect(result).toBe(true);
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
    });

    test('uses execCommand fallback when clipboard API write rejects', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('blocked'));
        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText
            }
        });

        const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);

        const result = await copyTextToClipboard('fallback text');

        expect(result).toBe(true);
        expect(writeText).toHaveBeenCalledWith('fallback text');
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
    });

    test('returns false when fallback copy fails', async () => {
        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: undefined
        });

        vi.spyOn(document, 'execCommand').mockReturnValue(false);

        const result = await copyTextToClipboard('failure text');

        expect(result).toBe(false);
    });
});
