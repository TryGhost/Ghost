export function stripHtml(html: string, exclude: string[] = []): string {
    // If no exclusions, use the original logic
    if (exclude.length === 0) {
        // Replace <br> tags with spaces
        const withLineBreaks = html.replace(/<br\s*\/?>/gi, ' ');

        // Replace tags that should have a space after them
        const withSpaces = withLineBreaks.replace(/<\/p>\s*<p>|<\/div>\s*<div>|<\/h[1-6]>\s*<|<\/li>\s*<li>|<\/a>/gi, ' ');

        // Remove all HTML tags
        return withSpaces.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Convert exclusions to lowercase for case-insensitive matching
    const excludeTags = exclude.map(tag => tag.toLowerCase());

    // Create a temporary placeholder for excluded tags
    const placeholders: {[key: string]: string} = {};
    let placeholderCount = 0;

    // Convert block-level closing tags to <br> before extracting excluded tags
    // This handles headings, paragraphs, divs, list items, etc.
    const withBlockBreaks = html.replace(/<\/(h[1-6]|p|div|li|blockquote|pre)>/gi, '<br>');

    // Process each excluded tag type (including the <br> tags we just added)
    let processedWithExclusions = withBlockBreaks;
    for (const tag of excludeTags) {
        // Match both opening and closing tags, and self-closing tags
        const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>|<${tag}[^>]*\\/?>`, 'gis');

        processedWithExclusions = processedWithExclusions.replace(regex, (match) => {
            const placeholder = `__EXCLUDED_TAG_${placeholderCount += 1}__`;
            placeholders[placeholder] = match;
            return placeholder;
        });
    }

    // Replace <br> tags with spaces (only if 'br' is not in exclusions)
    let withLineBreaks = processedWithExclusions;
    if (!excludeTags.includes('br')) {
        withLineBreaks = processedWithExclusions.replace(/<br\s*\/?>/gi, ' ');
    }

    // Remove all remaining HTML tags
    let result = withLineBreaks.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Restore the excluded tags
    for (const [placeholder, originalTag] of Object.entries(placeholders)) {
        result = result.replace(placeholder, originalTag);
    }

    return result;
}

export const formatArticle = (content: string, postUrl?: string) => {
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = content;

    if (postUrl) {
        // Find all audio and video card divs
        const mediaCards = div.querySelectorAll('.kg-audio-card, .kg-video-card');

        // Wrap each media card in an anchor tag
        for (let i = 0; i < mediaCards.length; i++) {
            const mediaCard = mediaCards[i] as HTMLElement;
            const wrapper = document.createElement('a');
            wrapper.href = postUrl;
            wrapper.target = '_blank';
            wrapper.rel = 'noopener noreferrer';
            wrapper.style.cursor = 'pointer';
            wrapper.style.display = 'block';
            wrapper.style.textDecoration = 'none';
            wrapper.style.color = 'inherit';

            // Move the media card into the wrapper
            mediaCard.parentNode?.insertBefore(wrapper, mediaCard);
            wrapper.appendChild(mediaCard);
        }
    }

    // Find all anchor tags
    const links = div.getElementsByTagName('a');

    // Add target="_blank" and rel attributes to each link
    for (let i = 0; i < links.length; i++) {
        links[i].setAttribute('target', '_blank');
        links[i].setAttribute('rel', 'noopener noreferrer');
    }

    return div.innerHTML;
};

export const openLinksInNewTab = (content: string) => {
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = content;

    // Find all anchor tags
    const links = div.getElementsByTagName('a');

    // Add target="_blank" and rel attributes to each link
    for (let i = 0; i < links.length; i++) {
        const href = links[i].getAttribute('href') || '';
        // Block javascript:, data:, and other dangerous protocols
        if (href.match(/^\s*(javascript|data|vbscript):/i)) {
            links[i].removeAttribute('href');
        }
        links[i].setAttribute('target', '_blank');
        links[i].setAttribute('rel', 'noopener noreferrer');
    }

    return div.innerHTML;
};

export const formatFollowNumber = (n: number) => {
    if (n < 10000) {
        return n.toLocaleString();
    }

    const kValue = n / 1000;
    // Round to 1 decimal place if needed
    const formatted = kValue % 1 === 0 ? kValue : kValue.toFixed(1);
    return `${formatted}K`;
};
