// # Amp Components Helper
// Usage: `{{amp_components}}`
//
// Reads through the AMP HTML and adds neccessary scripts
// for each extended component
// If more components need to be added, we can add more scripts.
// Here's the list of all supported extended components: https://www.ampproject.org/docs/reference/extended.html
// By default supported AMP HTML tags (no additional script tag necessary):
// amp-img, amp-ad, amp-embed, amp-video and amp-pixel.
// (less) dirty requires
const {settingsCache} = require('../../../../services/proxy');
const {SafeString} = require('../../../../services/handlebars');

function ampComponents() {
    let components = [];
    let html = this.post && this.post.html || this.html;

    if (!html) {
        return;
    }

    if (html.indexOf('.gif') !== -1) {
        components.push('<script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>');
    }

    let iframeCount = (html.match(/(<iframe)(.*?\s*?)(<\/iframe>)/gi) || []).length;
    let youtubeCount = (html.match(/(<iframe)(.*?\s*?)(youtu.be\/|youtube(-nocookie)?.com\/(v\/|.*u\/\w\/|embed\/|.*v=))(.*?\s*?)(<\/iframe>)/gi) || []).length;

    if (youtubeCount) {
        components.push('<script async custom-element="amp-youtube" src="https://cdn.ampproject.org/v0/amp-youtube-0.1.js"></script>');
    }

    if (iframeCount > youtubeCount) {
        components.push('<script async custom-element="amp-iframe" src="https://cdn.ampproject.org/v0/amp-iframe-0.1.js"></script>');
    }

    if (html.indexOf('<audio') !== -1) {
        components.push('<script async custom-element="amp-audio" src="https://cdn.ampproject.org/v0/amp-audio-0.1.js"></script>');
    }

    if (settingsCache.get('amp_gtag_id')) {
        components.push('<script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"></script>');
    }

    return new SafeString(components.join('\n'));
}

module.exports = ampComponents;
