import type {FactoryPlugin} from './types';

export {FactoryPlugin} from './types';

export abstract class Factory implements FactoryPlugin {
    abstract name: string;
    
    abstract setup(): Promise<void>;
    abstract destroy(): Promise<void>;
    
    // Helper method for generating IDs
    protected generateId(): string {
        return Date.now().toString(16) + Math.random().toString(16).substr(2, 8);
    }
    
    // Helper method for generating UUIDs
    protected generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Helper method for generating slugs
    protected generateSlug(text: string): string {
        return text.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}