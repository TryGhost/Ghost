const {Color} = require('@tryghost/color-utils');
const audienceFeedback = require('../audience-feedback');

const templateStrings = {
    like: '%{feedback_button_like}%',
    dislike: '%{feedback_button_dislike}%'
};

const generateLinks = (postId, uuid, html) => {
    const positiveLink = audienceFeedback.service.buildLink(
        uuid,
        postId,
        1
    );
    const negativeLink = audienceFeedback.service.buildLink(
        uuid,
        postId,
        0
    );

    html = html.replace(templateStrings.like, positiveLink.href);
    html = html.replace(templateStrings.dislike, negativeLink.href);

    return html;
};

const getTemplate = (accentColor) => {
    const likeButtonHtml = getButtonHtml(templateStrings.like, 'More like this', accentColor);
    const dislikeButtonHtml = getButtonHtml(templateStrings.dislike, 'Less like this', accentColor);

    return (`
        <tr>
            <td dir="ltr" width="100%" style="background-color: #ffffff; text-align: center; padding: 40px 4px; border-bottom: 1px solid #e5eff5" align="center">
                <h3 style="text-align: center; margin-bottom: 22px; font-size: 17px; letter-spacing: -0.2px; margin-top: 0 !important;">What did you think of this post?</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: auto; width: auto !important;">
                    <tr>
                        ${likeButtonHtml}
                        ${dislikeButtonHtml}
                    </tr>
                </table>
            </td>
        </tr>
    `);
};

function getButtonHtml(href, buttonText, accentColor) {
    const color = new Color(accentColor);
    const bgColor = `${accentColor}10`;
    const textColor = color.darken(0.6).hex();

    return (`
        <td dir="ltr" valign="top" align="center" style="font-family: inherit; font-size: 14px; text-align: center;" nowrap>
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: auto !important;">
                <tr>
                    <td style="padding: 0 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
                        <a href=${href} style="background-color: ${bgColor}; color: ${textColor}; border-radius: 22px; font-family: inherit; padding: 12px 20px; border: none; font-size: 14px; font-weight: bold; line-height: 100%; text-decoration: none; display: block;">
                            ${buttonText}
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    `);
}

module.exports = {
    generateLinks,
    getTemplate
};
