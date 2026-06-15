import DOMPurifyModule from 'dompurify';

type DOMPurifyInstance = {
    sanitize(dirty: string, config?: {
        ALLOWED_TAGS?: string[];
        ALLOWED_ATTR?: string[];
    }): string;
};

type DOMPurifyFactory = ((window: Window) => DOMPurifyInstance) & Partial<DOMPurifyInstance>;

function getDOMPurify(): DOMPurifyInstance {
    const domPurify = DOMPurifyModule as unknown as DOMPurifyFactory;
    if (typeof domPurify.sanitize === 'function') {
        return domPurify as DOMPurifyInstance;
    }
    return domPurify(window);
}

export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) {
        return '';
    }

    return getDOMPurify().sanitize(html, {
        ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
}
