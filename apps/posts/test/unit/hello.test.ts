import {describe, it, expect} from 'vitest';

describe('Hello', () => {
    it('should return the correct greeting', () => {
        const greeting = 'Hello, world!';
        expect(greeting).toBe('Hello, world!');
    });

    it('should concatenate strings correctly', () => {
        const name = 'Ghost';
        const greeting = `Hello, ${name}!`;
        expect(greeting).toBe('Hello, Ghost!');
    });
});
