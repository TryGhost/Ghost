import type {ReadonlyDeep} from 'type-fest';

export function getOgType(data: ReadonlyDeep<{context?: unknown[]}>): 'profile' | 'article' | 'website' {
    const context = data.context ? data.context[0] : null;

    if (context === 'author') {
        return 'profile';
    }
    if (context === 'post') {
        return 'article';
    }
    return 'website';
}
