import {sanitizeHtml, validateHexColor} from '../../src/utils/sanitize-html';

describe('sanitizeHtml', () => {
    test('returns empty string for null input', () => {
        const result = sanitizeHtml(null);
        expect(result).toBe('');
    });

    test('returns empty string for undefined input', () => {
        const result = sanitizeHtml(undefined);
        expect(result).toBe('');
    });

    test('returns empty string for empty string input', () => {
        const result = sanitizeHtml('');
        expect(result).toBe('');
    });

    test('handles plain text without HTML', () => {
        const input = 'Just plain text';
        const result = sanitizeHtml(input);
        expect(result).toBe('Just plain text');
    });

    test('removes script tags', () => {
        const input = '<script>alert("XSS")</script>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('removes onerror event handlers from img tags', () => {
        const input = '<img src=x onerror=alert("XSS")>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('removes onclick event handlers', () => {
        const input = '<a href="#" onclick="alert(\'XSS\')">Click me</a>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<a href="#">Click me</a>');
    });

    test('removes javascript: protocol from href', () => {
        const input = '<a href="javascript:alert(\'XSS\')">Click me</a>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<a>Click me</a>');
    });

    test('removes iframe tags', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('removes svg with embedded script', () => {
        const input = '<svg onload="alert(\'XSS\')"><circle r="50"></circle></svg>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('removes data: protocol', () => {
        const input = '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<a>Click</a>');
    });

    test('removes style tags', () => {
        const input = '<style>body { background: red; }</style>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('removes form elements', () => {
        const input = '<form action="https://evil.com"><input type="text"></form>';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('removes object and embed tags', () => {
        const input = '<object data="malicious.swf"></object><embed src="malicious.swf">';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('handles nested malicious content', () => {
        const input = '<p><a href="#" onclick="alert(1)"><img src=x onerror=alert(2)></a></p>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<p><a href="#"></a></p>');
    });

    test('handles URL-encoded XSS attempt', () => {
        const input = '<img src=x onerror="alert(String.fromCharCode(88,83,83))">';
        const result = sanitizeHtml(input);
        expect(result).toBe('');
    });

    test('allows basic text formatting', () => {
        const input = '<p>Hello <strong>world</strong> and <em>italic</em></p>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<p>Hello <strong>world</strong> and <em>italic</em></p>');
    });

    test('allows anchor tags with safe href', () => {
        const input = '<a href="https://example.com">Link</a>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<a href="https://example.com">Link</a>');
    });

    test('allows anchor tags with target attribute', () => {
        const input = '<a href="https://example.com" target="_blank">Link</a>';
        const result = sanitizeHtml(input);
        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('target="_blank"');
        expect(result).toContain('>Link</a>');
    });

    test('allows anchor tags with rel attribute', () => {
        const input = '<a href="https://example.com" rel="noopener">Link</a>';
        const result = sanitizeHtml(input);
        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('rel="noopener"');
        expect(result).toContain('>Link</a>');
    });

    test('allows line breaks', () => {
        const input = 'Line 1<br>Line 2';
        const result = sanitizeHtml(input);
        expect(result).toBe('Line 1<br>Line 2');
    });

    test('allows lists', () => {
        const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
    });

    test('allows ordered lists', () => {
        const input = '<ol><li>First</li><li>Second</li></ol>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<ol><li>First</li><li>Second</li></ol>');
    });

    test('allows bold and italic tags', () => {
        const input = '<b>bold</b> and <i>italic</i>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<b>bold</b> and <i>italic</i>');
    });

    test('allows span with class attribute', () => {
        const input = '<span class="highlight">text</span>';
        const result = sanitizeHtml(input);
        expect(result).toBe('<span class="highlight">text</span>');
    });
});

describe('validateHexColor', () => {
    test('accepts 3-digit hex color', () => {
        expect(validateHexColor('#fff')).toBe('#fff');
        expect(validateHexColor('#ABC')).toBe('#ABC');
        expect(validateHexColor('#123')).toBe('#123');
    });

    test('accepts 6-digit hex color', () => {
        expect(validateHexColor('#ffffff')).toBe('#ffffff');
        expect(validateHexColor('#AABBCC')).toBe('#AABBCC');
        expect(validateHexColor('#45C32E')).toBe('#45C32E');
    });

    test('accepts 4-digit hex color with alpha', () => {
        expect(validateHexColor('#fffa')).toBe('#fffa');
        expect(validateHexColor('#ABCD')).toBe('#ABCD');
    });

    test('accepts 8-digit hex color with alpha', () => {
        expect(validateHexColor('#ffffffaa')).toBe('#ffffffaa');
        expect(validateHexColor('#AABBCCDD')).toBe('#AABBCCDD');
    });

    test('returns empty string for null', () => {
        expect(validateHexColor(null)).toBe('');
    });

    test('returns empty string for non-string', () => {
        expect(validateHexColor(123)).toBe('');
        expect(validateHexColor({})).toBe('');
        expect(validateHexColor([])).toBe('');
    });

    test('returns empty string for color without hash', () => {
        expect(validateHexColor('ffffff')).toBe('');
        expect(validateHexColor('fff')).toBe('');
    });

    test('returns empty string for invalid hex characters', () => {
        expect(validateHexColor('#gggggg')).toBe('');
        expect(validateHexColor('#xyz')).toBe('');
    });

    test('returns empty string for wrong length', () => {
        expect(validateHexColor('#ff')).toBe('');
        expect(validateHexColor('#fffff')).toBe('');
        expect(validateHexColor('#fffffff')).toBe('');
    });

    test('rejects CSS injection via closing brace', () => {
        const malicious = '#fff; } body { background: red; } .x {';
        expect(validateHexColor(malicious)).toBe('');
    });

    test('rejects CSS injection via url()', () => {
        const malicious = '#fff; background: url(https://evil.com)';
        expect(validateHexColor(malicious)).toBe('');
    });

    test('rejects CSS injection via expression', () => {
        const malicious = '#fff; behavior: expression(alert(1))';
        expect(validateHexColor(malicious)).toBe('');
    });

    test('rejects CSS injection via import', () => {
        const malicious = '#fff; @import url(https://evil.com/malicious.css)';
        expect(validateHexColor(malicious)).toBe('');
    });

    test('rejects script injection attempt', () => {
        const malicious = '</style><script>alert(1)</script><style>';
        expect(validateHexColor(malicious)).toBe('');
    });

    test('rejects HTML entity encoded injection', () => {
        const malicious = '#fff&#59; } body { display: none }';
        expect(validateHexColor(malicious)).toBe('');
    });
});
