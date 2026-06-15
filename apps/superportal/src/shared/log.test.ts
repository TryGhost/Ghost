import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {error, reportError, setLogReporter, warn} from './log';

describe('log reporter routing', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        setLogReporter(null);
        vi.restoreAllMocks();
    });

    it('forwards warn with an Error arg as warning level', () => {
        const reporter = vi.fn();
        setLogReporter(reporter);
        const err = new Error('boom');

        warn('something failed', err);

        expect(reporter).toHaveBeenCalledWith('warning', 'something failed', err);
        expect(console.warn).toHaveBeenCalled();
    });

    it('does not forward string-only warns', () => {
        const reporter = vi.fn();
        setLogReporter(reporter);

        warn('gift enabled without members');

        expect(reporter).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it('forwards error with an Error arg as error level', () => {
        const reporter = vi.fn();
        setLogReporter(reporter);
        const err = new Error('boom');

        error('it broke', err);

        expect(reporter).toHaveBeenCalledWith('error', 'it broke', err);
    });

    it('reportError forwards without console output', () => {
        const reporter = vi.fn();
        setLogReporter(reporter);
        const err = new Error('render failed');

        reportError(err);

        expect(reporter).toHaveBeenCalledWith('error', 'unhandled error', err);
        expect(console.error).not.toHaveBeenCalled();
    });

    it('stops forwarding when the reporter is cleared', () => {
        const reporter = vi.fn();
        setLogReporter(reporter);
        setLogReporter(null);

        warn('x', new Error('y'));
        reportError(new Error('z'));

        expect(reporter).not.toHaveBeenCalled();
    });

    it('a throwing reporter never breaks logging', () => {
        setLogReporter(() => {
            throw new Error('reporter exploded');
        });

        expect(() => warn('x', new Error('y'))).not.toThrow();
        expect(() => reportError(new Error('z'))).not.toThrow();
        expect(console.warn).toHaveBeenCalled();
    });
});
