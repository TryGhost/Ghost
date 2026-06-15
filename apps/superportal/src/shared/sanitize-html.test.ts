// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';

import {sanitizeHtml} from './sanitize-html';

describe('sanitizeHtml', () => {
    it('removes unsafe markup and preserves allowed formatting', () => {
        const result = sanitizeHtml('<p>Accept <a href="/terms" onclick="alert(1)">terms</a><img src=x onerror=alert(1)><script>alert(1)</script></p>');

        expect(result).toBe('<p>Accept <a href="/terms">terms</a></p>');
    });
});
