import {Color, textColorForBackgroundColor} from '@tryghost/color-utils';
import {htmlSafe} from '@ember/template';
// Pulls what the author actually configured on their paywall card out of the
// post's lexical, so the publish flow can preview the real thing rather than a
// generic illustration.

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

// Bold and italics are content on these cards, so the preview has to keep them
// or it won't match the editor. Everything outside this allowlist is dropped -
// the string is the author's own cleaned basic HTML, but the preview shouldn't
// be a route for anything else to render.
const ALLOWED_INLINE_TAGS = ['b', 'strong', 'i', 'em', 'u', 's'];

function toBasicHtml(html) {
    if (!html) {
        return '';
    }

    const cleaned = html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<(\/?)([a-z0-9]+)[^>]*>/gi, (match, slash, tag) => (
            ALLOWED_INLINE_TAGS.includes(tag.toLowerCase()) ? `<${slash}${tag.toLowerCase()}>` : ''
        ))
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // htmlSafe('') is a truthy object, which would render an empty element
    return cleaned ? htmlSafe(cleaned) : '';
}

// walks a lexical node for its readable text
function nodeText(node) {
    if (!node) {
        return '';
    }

    if (typeof node.text === 'string') {
        return node.text;
    }

    if (Array.isArray(node.children)) {
        return node.children.map(nodeText).join('');
    }

    return '';
}

// The tail of the post, so the author can see where the free preview stops.
// Trimmed to a few lines - the hover card is a reminder, not a reader.
function precedingText(children, cardIndex, maxLength = 160) {
    const text = children
        .slice(0, cardIndex)
        .map(nodeText)
        .filter(paragraph => paragraph.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length <= maxLength) {
        return text;
    }

    // start at a word boundary so the fade doesn't clip mid-word
    const tail = text.slice(-maxLength);
    return tail.slice(tail.indexOf(' ') + 1);
}

/**
 * Text colour for a card sitting on the brand colour.
 *
 * Only the accent background needs this - the rest are fixed tints whose text
 * colour lives in the stylesheet. A site's accent can be anything, so assuming
 * white would disappear on a pale one.
 *
 * @param {string} backgroundColor - the card's background choice
 * @param {string} accentColor - the site's accent hex
 * @returns {import('@ember/template').SafeString|null}
 */
function textColorStyleFor(backgroundColor, accentColor) {
    if (backgroundColor !== 'accent' || !accentColor) {
        return null;
    }

    return htmlSafe(`color: ${textColorForBackgroundColor(Color(accentColor)).hex()}`);
}

// A colour off the card is author content, and it goes into a style attribute,
// so only a plain hex gets through.
const isHex = value => typeof value === 'string' && /^#(?:[a-fA-F\d]{3}|[a-fA-F\d]{6})$/.test(value);

/**
 * Button colours, matching what the card actually renders.
 *
 * On the brand colour the button inverts - it takes the card's readable text
 * colour and its label takes the accent, so it reads as a hole punched out of
 * the panel. Everywhere else it wears the colours the author set on the card,
 * which the stylesheet can't know, hence inline.
 *
 * @param {string} backgroundColor - the card's background choice
 * @param {string} buttonColor - the card's button colour: a hex, or 'accent'
 * @param {string} buttonTextColor - the card's button label colour
 * @param {string} accentColor - the site's accent hex
 * @returns {import('@ember/template').SafeString|null}
 */
function buttonStyleFor(backgroundColor, buttonColor, buttonTextColor, accentColor) {
    if (backgroundColor === 'accent' && isHex(accentColor)) {
        const readable = textColorForBackgroundColor(Color(accentColor)).hex();
        return htmlSafe(`background-color: ${readable}; color: ${accentColor}`);
    }

    const background = buttonColor === 'accent' ? accentColor : buttonColor;

    if (!isHex(background) || !isHex(buttonTextColor)) {
        return null;
    }

    return htmlSafe(`background-color: ${background}; color: ${buttonTextColor}`);
}

/**
 * @param {object} post - the post being published
 * @param {'web'|'email'} target - which of the card's two paywalls to preview
 * @param {string} [accentColor] - the site's accent hex, for accent backgrounds
 * @returns {object|null} the card's content, or null when the post has no paywall card
 */
export default function paywallCardPreview(post, target = 'web', accentColor = null) {
    const state = parseLexicalState(post?.lexicalScratch || post?.lexical);
    const children = state?.root?.children;

    if (!Array.isArray(children)) {
        return null;
    }

    const cardIndex = children.findIndex(node => node?.type === 'paywall-v2');

    if (cardIndex === -1) {
        return null;
    }

    const card = children[cardIndex];

    const read = name => card[`${target}${name}`];

    const backgroundColor = read('BackgroundColor') || 'grey';
    const layout = read('Layout') === 'minimal' ? 'minimal' : 'immersive';

    return {
        precedingText: precedingText(children, cardIndex),
        heading: toBasicHtml(read('Heading')),
        text: toBasicHtml(read('TextValue')),
        buttonText: read('ShowButton') === false ? null : read('ButtonText'),
        buttonStyle: buttonStyleFor(backgroundColor, read('ButtonColor'), read('ButtonTextColor'), accentColor),
        imageUrl: read('ImageUrl') || null,
        backgroundColor,
        textColorStyle: textColorStyleFor(backgroundColor, accentColor),
        layout,
        // Alignment is an immersive-only setting: a minimal card puts its image
        // beside the text, and `.kg-paywall-centered` only takes effect on the
        // immersive layout. Centring a minimal card here made the preview
        // disagree with what actually renders.
        isCentered: layout === 'immersive' && read('Alignment') !== 'left',
        // dividers are the only thing separating a borderless card from the
        // paragraphs around it, and they exist for that background alone
        showDividers: backgroundColor === 'none' && read('ShowDividers') !== false,
        linkColor: read('LinkColor') === 'accent' ? 'accent' : 'text',
        // the sign-in prompt is web-only and always rendered by Ghost
        showSignIn: target === 'web'
    };
}
