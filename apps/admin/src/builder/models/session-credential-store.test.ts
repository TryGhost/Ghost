import {describe, expect, it} from 'vitest';

import {SessionCredentialStore} from './session-credential-store';

class MemoryStorage implements Storage {
    private readonly values = new Map<string, string>();

    get length(): number {
        return this.values.size;
    }

    clear(): void {
        this.values.clear();
    }

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    key(index: number): string | null {
        return [...this.values.keys()][index] ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

describe('SessionCredentialStore', () => {
    it('keeps provider credentials in the supplied session storage and forgets them independently', () => {
        const storage = new MemoryStorage();
        const credentials = new SessionCredentialStore(storage);

        credentials.set('openai', 'openai-secret');
        credentials.set('anthropic', 'anthropic-secret');

        expect(credentials.get('openai')).toBe('openai-secret');
        expect(credentials.get('anthropic')).toBe('anthropic-secret');
        expect([...Array.from({length: storage.length}, (_, index) => storage.key(index))]).toEqual([
            'ghost-builder.credential.openai',
            'ghost-builder.credential.anthropic'
        ]);

        credentials.forget('openai');

        expect(credentials.get('openai')).toBeUndefined();
        expect(credentials.get('anthropic')).toBe('anthropic-secret');
    });

    it('clears only Builder credentials when the Admin session ends', () => {
        const storage = new MemoryStorage();
        storage.setItem('unrelated', 'keep-me');
        const credentials = new SessionCredentialStore(storage);
        credentials.set('openai', 'openai-secret');
        credentials.set('anthropic', 'anthropic-secret');

        credentials.clear();

        expect(credentials.get('openai')).toBeUndefined();
        expect(credentials.get('anthropic')).toBeUndefined();
        expect(storage.getItem('unrelated')).toBe('keep-me');
    });
});
