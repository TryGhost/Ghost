export function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
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