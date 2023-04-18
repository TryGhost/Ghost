export async function fetchEmbed(url) {
    let urlObject = new URL(url);
    if (!urlObject) {
        throw new Error('No URL specified.');
    }
    try {
        await delay(500);
        // let html = await (await fetch(url)).text();

        const testData = {
            url: 'https://www.ghost.org/',
            // html used for embed
            html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"></iframe>',
            metadata: {
                icon: 'https://www.ghost.org/favicon.ico',
                title: 'Ghost: The Creator Economy Platform',
                description: 'The former of the two songs addresses the issue of negative rumors in a relationship, while the latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped bridge.',
                publisher: 'Ghost - The Professional Publishing Platform',
                author: 'Author McAuthory',
                thumbnail: 'https://ghost.org/images/meta/ghost.png'
            }
        };
        return testData;
    } catch (e) {
        // console.log(e);
    }
}

function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
