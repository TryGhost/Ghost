module.exports = class WebmentionMetadata {
    /**
     * @param {URL} url
     * @returns {Promise<import('./MentionsAPI').WebmentionMetadata>}
     */
    async fetch() {
        return {
            siteTitle: 'Clickbait News',
            title: 'This egg breakfast will make you cry',
            excerpt: 'How many times have you woken up and almost cancelled your church plans? Well this breakfast is about to change everything, a hearty, faith restoring egg dish that will get your tastebuds in a twist.',
            author: 'Dr Egg Man',
            image: new URL('https://unsplash.com/photos/QAND9huzD04'),
            favicon: new URL('https://ghost.org/favicon.ico')
        };
    }
};
