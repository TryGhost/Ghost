// Copied from ghost/core/core/frontend/meta/og-type.ts @ 407e032dc7 —
// transforms: `type-fest` ReadonlyDeep annotation inlined (avoids a types-only dep).
export function getOgType(data: {context?: readonly unknown[]}): 'profile' | 'article' | 'website' {
    const context = data.context ? data.context[0] : null;

    if (context === 'author') {
        return 'profile';
    }
    if (context === 'post') {
        return 'article';
    }
    return 'website';
}
