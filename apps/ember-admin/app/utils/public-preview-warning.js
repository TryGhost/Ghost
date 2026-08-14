const PUBLIC_ACCESS = 'public-access';
const NO_CONTENT_BEFORE = 'no-content-before';
const NO_CONTENT_AFTER = 'no-content-after';

function parseLexicalState(lexical) {
    if (!lexical) {
        return null;
    }

    try {
        return typeof lexical === 'string' ? JSON.parse(lexical) : lexical;
    } catch {
        return null;
    }
}

function lexicalNodeHasContent(node) {
    if (!node || node.type === 'paywall' || node.type === 'linebreak') {
        return false;
    }

    if (typeof node.text === 'string') {
        return !!node.text.trim();
    }

    if (node.type === 'text' || node.type === 'extended-text') {
        return false;
    }

    if (Array.isArray(node.children)) {
        return node.children.some(lexicalNodeHasContent);
    }

    return node.type !== 'paragraph' && node.type !== 'root';
}

export function getPublicPreviewWarning(post) {
    const state = parseLexicalState(post.lexicalScratch || post.lexical);
    const children = state?.root?.children;

    if (!Array.isArray(children)) {
        return null;
    }

    const publicPreviewIndex = children.findIndex(node => node?.type === 'paywall');

    if (publicPreviewIndex === -1) {
        return null;
    }

    if (post.visibility === 'public') {
        return PUBLIC_ACCESS;
    }

    if (!children.slice(0, publicPreviewIndex).some(lexicalNodeHasContent)) {
        return NO_CONTENT_BEFORE;
    }

    if (!children.slice(publicPreviewIndex + 1).some(lexicalNodeHasContent)) {
        return NO_CONTENT_AFTER;
    }

    return null;
}
