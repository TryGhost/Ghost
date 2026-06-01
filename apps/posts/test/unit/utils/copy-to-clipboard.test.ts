import copyToClipboard from '@src/utils/copy-to-clipboard';
import {afterEach, describe, expect, it, vi} from 'vitest';

function setClipboard(value: unknown) {
    Object.defineProperty(navigator, 'clipboard', {value, configurable: true});
}

describe('copyToClipboard', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        setClipboard(undefined);
    });

    it('uses the async clipboard API when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        setClipboard({writeText});

        await copyToClipboard('hello');

        expect(writeText).toHaveBeenCalledWith('hello');
    });

    it('falls back to execCommand when the async clipboard API is unavailable (non-secure context)', async () => {
        setClipboard(undefined);
        const execCommand = vi.fn().mockReturnValue(true);
        document.execCommand = execCommand;

        await copyToClipboard('hello');

        expect(execCommand).toHaveBeenCalledWith('copy');
    });

    it('falls back to execCommand when writeText rejects (clipboard-write blocked)', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
        setClipboard({writeText});
        const execCommand = vi.fn().mockReturnValue(true);
        document.execCommand = execCommand;

        await copyToClipboard('hello');

        expect(writeText).toHaveBeenCalled();
        expect(execCommand).toHaveBeenCalledWith('copy');
    });
});
