import {describe, expect, it} from 'vitest';
import {STATIC_EXECUTION_CSP} from '../../src/sandbox/static-execution-policy.ts';
import {createSandboxSrcdoc} from '../../src/host/shim.ts';

describe('static execution sandbox', function () {
    it('blocks network and resource loading before any provider code is evaluated', function () {
        const srcdoc = createSandboxSrcdoc({staticExecution: true});
        const parsed = new DOMParser().parseFromString(srcdoc, 'text/html');

        const policy = parsed.head.querySelector('meta[http-equiv="Content-Security-Policy"]');
        expect(policy?.getAttribute('content')).toBe(STATIC_EXECUTION_CSP);
        expect(STATIC_EXECUTION_CSP).toContain("connect-src 'none'");
        expect(STATIC_EXECUTION_CSP).toContain("default-src 'none'");
        expect(STATIC_EXECUTION_CSP).toContain("form-action 'none'");
        expect(STATIC_EXECUTION_CSP).toContain('worker-src blob:');
        expect(srcdoc).toContain('new Worker');
        expect(srcdoc).not.toContain('(0, eval)(data.bootstrap)');
        expect(() => new Function(parsed.head.querySelector('script')?.textContent ?? '')).not.toThrow();
    });

    it('does not constrain the existing capability-bearing Admin sandbox', function () {
        const parsed = new DOMParser().parseFromString(createSandboxSrcdoc(), 'text/html');

        expect(parsed.head.querySelector('meta[http-equiv="Content-Security-Policy"]')).toBeNull();
    });
});
