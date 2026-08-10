// Extracted from ./comment-metrics so that file only exports components
// (react-refresh/only-export-components).
export function buildThreadLink(searchParams: URLSearchParams, commentId: string | undefined | null): string | undefined {
    if (!commentId) {
        return undefined;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set('thread', `is:${commentId}`);
    return `?${newParams.toString()}`;
}
