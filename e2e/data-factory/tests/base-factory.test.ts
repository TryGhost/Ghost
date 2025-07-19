import {test, expect} from '@playwright/test';
import {Factory} from '../base-factory';

// Concrete implementation of Factory for testing
class TestFactory extends Factory {
    name = 'test';
    
    async setup(): Promise<void> {
        // Mock setup
    }
    
    async destroy(): Promise<void> {
        // Mock destroy
    }
    
    // Expose protected methods for testing
    public testGenerateId(): string {
        return this.generateId();
    }
    
    public testGenerateUuid(): string {
        return this.generateUuid();
    }
    
    public testGenerateSlug(text: string): string {
        return this.generateSlug(text);
    }
}

test.describe('Base Factory', () => {
    let factory: TestFactory;
    
    test.beforeEach(() => {
        factory = new TestFactory();
    });
    
    test('should have a name property', () => {
        expect(factory.name).toBe('test');
    });
    
    test('should generate unique IDs', () => {
        const id1 = factory.testGenerateId();
        const id2 = factory.testGenerateId();
        
        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe('string');
        expect(typeof id2).toBe('string');
    });
    
    test('should generate valid UUIDs', () => {
        const uuid1 = factory.testGenerateUuid();
        const uuid2 = factory.testGenerateUuid();
        
        // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        expect(uuid1).toMatch(uuidRegex);
        expect(uuid2).toMatch(uuidRegex);
        expect(uuid1).not.toBe(uuid2);
    });
    
    test('should generate slugs from text', () => {
        const testCases = [
            {input: 'Hello World', expected: 'hello-world'},
            {input: 'This Is A Test!', expected: 'this-is-a-test'},
            {input: 'Multiple   Spaces', expected: 'multiple-spaces'},
            {input: '  Leading and trailing spaces  ', expected: 'leading-and-trailing-spaces'},
            {input: 'Special @#$% Characters!', expected: 'special-characters'},
            {input: 'numbers-123-and-456', expected: 'numbers-123-and-456'},
            {input: 'Multiple---Dashes', expected: 'multiple-dashes'}
        ];
        
        testCases.forEach(({input, expected}) => {
            const result = factory.testGenerateSlug(input);
            expect(result).toBe(expected);
        });
    });
    
    test('should handle empty string in slug generation', () => {
        const result = factory.testGenerateSlug('');
        expect(result).toBe('');
    });
    
    test('should handle special characters in slug generation', () => {
        const result = factory.testGenerateSlug('Café & Restaurant');
        expect(result).toBe('caf-restaurant');
    });
    
    test('should implement setup method', async () => {
        // Should not throw
        await expect(factory.setup()).resolves.toBeUndefined();
    });
    
    test('should implement destroy method', async () => {
        // Should not throw
        await expect(factory.destroy()).resolves.toBeUndefined();
    });
});