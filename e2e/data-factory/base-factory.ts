import {v4 as uuid} from 'uuid';

export abstract class Factory {
    abstract name: string;
    
    abstract setup(): Promise<void>;
    abstract destroy(): Promise<void>;
    
    protected generateId(): string {
        return Date.now().toString(16) + Math.random().toString(16).substring(2, 10);
    }
    
    protected generateUuid(): string {
        return uuid();
    }
    
    protected generateSlug(text: string): string {
        return text.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}