import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import {buildCleanBasicHtmlForElement} from '../../utils/build-clean-basic-html-for-element.js';
import {getPaywallMemberSegment} from './paywall-access.js';
import {getResizedImageDimensions} from '../../utils/get-resized-image-dimensions.js';
import {renderEmailButton} from '../../utils/render-helpers/email-button.js';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import type {PaywallAccess} from './PaywallV2Node.js';

// The marker every downstream consumer keys off to split free preview from
// gated content (post-gating.js on web, email-renderer.js in email).
export const PAYWALL_MARKER = '<!--members-only-->';

// Matches the link the handlebars email paywall has always used - the post's own
// URL with a Portal hash. Stored bare so it isn't tied to one post.
export const PORTAL_SIGNUP_URL = '#/portal/signup';
const PORTAL_SIGNIN_URL = '#/portal/signin';

const SIGN_IN_PROMPT = 'Already a member?';
const SIGN_IN_LABEL = 'Sign in';

/**
 * Email clients can't resolve a bare fragment, so Portal links are expanded
 * against the post being sent - the same shape `email-renderer` builds for the
 * handlebars paywall (`postUrl` + `#/portal/signup`).
 */
function resolvePortalUrl(url: string, postUrl?: string) {
    if (!url || !url.startsWith('#') || !postUrl) {
        return url;
    }

    try {
        const resolved = new URL(postUrl);
        resolved.hash = url.slice(1);
        return resolved.href;
    } catch {
        return url;
    }
}

// Every setting exists once per target; nothing here is shared between the two
interface PaywallTargetData {
    layout: string;
    alignment: string;
    backgroundColor: string;
    linkColor: string;
    showDividers: boolean;
    buttonColor: string;
    buttonTextColor: string;
    heading: string;
    textValue: string;
    showButton: boolean;
    buttonText: string;
    buttonUrl: string;
    imageUrl: string;
    imageWidth: number | null;
    imageHeight: number | null;
}

interface PaywallV2NodeData {
    access: PaywallAccess | null;
    tiers?: string[];
    [key: string]: unknown;
}

interface PaywallV2RenderOptions extends ExportDOMOptions {
    design?: {
        buttonStyle?: 'fill' | 'outline';
        backgroundIsDark?: boolean;
        accentColor?: string;
    };
}

/**
 * The colours a card sitting on the brand colour has to use.
 *
 * Everything is written inline rather than left to CSS. The contrast of a
 * site's accent can't be known in a stylesheet, and email inlining makes
 * `inherit` unreliable, so each element carries its own value.
 *
 * The button inverts: it takes the card's text colour, and its label takes the
 * card colour. A button left on its stored colour either fights the card or, if
 * it's the accent itself, disappears into it.
 *
 * Returns null for every other background - those are fixed tints whose rules
 * live in the stylesheets, and an inline colour would override them.
 */
function accentColors(data: PaywallTargetData, options: PaywallV2RenderOptions) {
    if (data.backgroundColor !== 'accent' || !options.design?.accentColor) {
        return null;
    }

    const accent = options.design.accentColor;

    return {text: textColorForBackgroundColor(accent).hex(), accent};
}

const colorStyle = (color?: string) => (color ? ` style="color: ${color};"` : '');

function getTargetData(node: PaywallV2NodeData, target: 'web' | 'email'): PaywallTargetData {
    const read = (name: string) => node[`${target}${name}`];

    const backgroundColor = read('BackgroundColor') as string;

    return {
        layout: read('Layout') as string,
        alignment: read('Alignment') as string,
        // an unrecognised colour would land in a class name, so it's clamped here
        backgroundColor: backgroundColor && /^(?:[a-zA-Z\d-]+|#(?:[a-fA-F\d]{3}|[a-fA-F\d]{6}))$/.test(backgroundColor)
            ? backgroundColor
            : 'grey',
        linkColor: read('LinkColor') as string,
        showDividers: read('ShowDividers') as boolean,
        buttonColor: read('ButtonColor') as string,
        buttonTextColor: read('ButtonTextColor') as string,
        heading: (read('Heading') as string) || '',
        textValue: (read('TextValue') as string) || '',
        showButton: read('ShowButton') as boolean,
        buttonText: (read('ButtonText') as string) || '',
        buttonUrl: (read('ButtonUrl') as string) || '',
        imageUrl: (read('ImageUrl') as string) || '',
        imageWidth: read('ImageWidth') as number | null,
        imageHeight: read('ImageHeight') as number | null
    };
}

const hasButton = (data: PaywallTargetData) => data.showButton && data.buttonUrl && data.buttonText;

function cardClasses(data: PaywallTargetData) {
    return [
        'kg-card',
        'kg-paywall-card',
        `kg-paywall-bg-${data.backgroundColor}`,
        `kg-paywall-${data.layout}`,
        data.showDividers ? '' : 'kg-paywall-no-dividers',
        data.imageUrl ? 'kg-paywall-has-img' : '',
        data.linkColor === 'accent' ? 'kg-paywall-link-accent' : '',
        data.alignment === 'center' ? 'kg-paywall-centered' : ''
    ].filter(Boolean).join(' ');
}

function paywallCardTemplate(data: PaywallTargetData, options: PaywallV2RenderOptions) {
    const accent = accentColors(data, options);
    const buttonAccent = !accent && data.buttonColor === 'accent' ? 'kg-style-accent' : '';
    const buttonStyle = accent
        ? `style="background-color: ${accent.text}; color: ${accent.accent};"`
        : data.buttonColor === 'accent'
            ? `style="color: ${data.buttonTextColor};"`
            : `style="background-color: ${data.buttonColor}; color: ${data.buttonTextColor};"`;

    return `
        <div class="${cardClasses(data)}" data-layout="${data.layout}"${colorStyle(accent?.text)}>
            <div class="kg-paywall-content">
                ${data.imageUrl ? `
                    <div class="kg-paywall-image-container">
                        <img src="${data.imageUrl}" alt="" ${data.imageWidth && data.imageHeight ? `data-image-dimensions="${data.imageWidth}x${data.imageHeight}"` : ''}>
                    </div>
                ` : ''}
                <div class="kg-paywall-content-inner">
                    ${data.heading ? `
                        <div class="kg-paywall-heading" role="heading" aria-level="3"${colorStyle(accent?.text)}>${data.heading}</div>
                    ` : ''}
                    ${data.textValue ? `
                        <div class="kg-paywall-text"${colorStyle(accent?.text)}>${data.textValue}</div>
                    ` : ''}
                    ${hasButton(data) ? `
                        <a href="${data.buttonUrl}" class="kg-paywall-button ${buttonAccent}" ${buttonStyle}>${data.buttonText}</a>
                    ` : ''}
                </div>
            </div>
            <div class="kg-paywall-footer"${colorStyle(accent?.text)}>
                <span>${SIGN_IN_PROMPT}</span> <a href="${PORTAL_SIGNIN_URL}" data-portal="signin">${SIGN_IN_LABEL}</a>
            </div>
        </div>
    `;
}

function emailPaywallCardTemplate(data: PaywallTargetData, options: PaywallV2RenderOptions) {
    let imageDimensions: {width: number; height: number} | undefined;

    if (data.imageUrl && data.imageWidth && data.imageHeight) {
        imageDimensions = {width: data.imageWidth, height: data.imageHeight};

        if (data.imageWidth >= 560) {
            imageDimensions = getResizedImageDimensions(imageDimensions, {width: 560});
        }
    }

    const accent = accentColors(data, options);
    let buttonColor = accent ? accent.text : data.buttonColor;
    const isTransparent = data.backgroundColor === 'none' || data.backgroundColor === 'white';
    const isBlackButton = buttonColor === 'black' || buttonColor === '#000000' || buttonColor === '#000';

    if (isTransparent && options.design?.backgroundIsDark && isBlackButton) {
        buttonColor = '#ffffff';
    }

    const buttonHtml = renderEmailButton({
        url: data.buttonUrl,
        text: data.buttonText,
        color: buttonColor,
        // the label takes the card colour, so the button reads as a hole
        // punched out of the brand-coloured panel
        textColor: accent ? accent.accent : undefined,
        style: options.design?.buttonStyle
    });

    return `
        <table class="${cardClasses(data)}" border="0" cellpadding="0" cellspacing="0" width="100%"${colorStyle(accent?.text)}>
            <tr>
                <td class="kg-paywall-content">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="kg-paywall-content-wrapper">
                        ${data.imageUrl ? `
                            <tr>
                                <td class="kg-paywall-image-container">
                                    <img src="${data.imageUrl}" alt="" class="kg-paywall-image" ${imageDimensions ? `width="${imageDimensions.width}"` : ''} ${imageDimensions ? `height="${imageDimensions.height}"` : ''}>
                                </td>
                            </tr>
                        ` : ''}
                        ${data.heading ? `
                            <tr>
                                <td class="kg-paywall-heading"${colorStyle(accent?.text)}>${data.heading}</td>
                            </tr>
                        ` : ''}
                        ${data.textValue ? `
                            <tr>
                                <td class="kg-paywall-text"${colorStyle(accent?.text)}>${data.textValue}</td>
                            </tr>
                        ` : ''}
                        ${hasButton(data) ? `
                            <tr>
                                <td class="kg-paywall-button-container" align="${data.alignment}">${buttonHtml}</td>
                            </tr>
                        ` : ''}
                    </table>
                </td>
            </tr>
        </table>
    `;
}

/**
 * Both targets return raw markup via a textarea (`type: 'value'`) because the
 * output isn't a single element - it's the paywall card *plus* the members-only
 * marker, and on web a pair of gated-block comments around the card.
 */
function renderValue(document: Document, value: string): ExportDOMOutput<'value'> {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    return {element: textarea, type: 'value' as const};
}

export function renderPaywallV2Node(node: PaywallV2NodeData, options: PaywallV2RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const memberSegment = getPaywallMemberSegment(node.access, node.tiers ?? []);

    // The heading comes out of a nested editor wrapped in <p>, which can't live
    // inside the <h3> (web) or heading cell (email) it's rendered into
    const cleanBasicHtml = buildCleanBasicHtmlForElement(document.createElement('div'));
    const unwrapHeading = (heading: string) => cleanBasicHtml(heading, {firstChildInnerContent: true}) || '';

    if (options.target === 'email') {
        // Email recipients are always members, so a `members` paywall has no
        // audience - only the marker is needed to truncate the gated content.
        if (!memberSegment) {
            return renderValue(document, `\n${PAYWALL_MARKER}\n`);
        }

        const emailData = getTargetData(node, 'email');
        emailData.heading = unwrapHeading(emailData.heading);
        emailData.buttonUrl = resolvePortalUrl(emailData.buttonUrl, options.postUrl);

        const card = emailPaywallCardTemplate(emailData, options);

        // Marked for the email renderer to keep or drop by the audience's access
        // rather than by segment string - `data-gh-segment` only speaks the
        // free/paid axis, which can't describe a wrong-tier paid member.
        return renderValue(document, `\n<div class="kg-visibility-wrapper" data-gh-paywall="true">${card}</div>\n${PAYWALL_MARKER}\n`);
    }

    const webData = getTargetData(node, 'web');
    webData.heading = unwrapHeading(webData.heading);

    const card = paywallCardTemplate(webData, options);

    // The card sits *before* the marker so it survives the truncation applied to
    // readers without access, and is wrapped in a gated block so readers who do
    // have access never see it.
    return renderValue(document, `\n<!--kg-gated-block:begin nonMember:true memberSegment:"${memberSegment}" -->${card}<!--kg-gated-block:end-->\n${PAYWALL_MARKER}\n`);
}
