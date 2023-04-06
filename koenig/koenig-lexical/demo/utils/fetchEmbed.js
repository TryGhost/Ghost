export async function fetchEmbed(url, {type}) {
    let urlObject = new URL(url);
    if (!urlObject) {
        throw new Error('No URL specified.');
    }
    try {
        url = url.trim();

        if (type !== 'bookmark') {
            throw new Error('Only the bookmark type is supported for embeds.');
        }
        
        // let html = await (await fetch(url)).text();

        const testData = {
            url: 'https://www.ghost.org/',
            icon: 'https://www.ghost.org/favicon.ico',
            title: 'Ghost: The Creator Economy Platform',
            description: 'The former of the two songs addresses the issue of negative rumors in a relationship, while the latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped bridge.',
            publisher: 'Ghost - The Professional Publishing Platform',
            author: 'Author McAuthory',
            thumbnail: 'https://ghost.org/images/meta/ghost.png',
            caption: 'caption here'
        };

        return testData;
    } catch (e) {
        // console.log(e);
    }
}