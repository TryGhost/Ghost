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

    html = html.replace(new RegExp(templateStrings.like, 'g'), positiveLink.href);
    html = html.replace(new RegExp(templateStrings.dislike, 'g'), negativeLink.href);

    return html;
};

const getTemplate = () => {
    const likeButtonHtml = getButtonHtml(
        templateStrings.like,
        'More like this',
        'https://static.ghost.org/v5.0.0/images/more-like-this.png'
    );
    const dislikeButtonHtml = getButtonHtml(
        templateStrings.dislike,
        'Less like this',
        'https://static.ghost.org/v5.0.0/images/less-like-this.png'
    );

    return (`
        <tr>
            <td dir="ltr" width="100%" style="background-color: #ffffff; text-align: center; padding: 40px 4px; border-bottom: 1px solid #e5eff5" align="center">
                <h3 style="text-align: center; margin-bottom: 22px; font-size: 17px; letter-spacing: -0.2px; margin-top: 0 !important;">Give feedback on this post</h3>
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

function getButtonHtml(href, buttonText, iconUrl) {
    return (`
         <td dir="ltr" valign="top" align="center" style="vertical-align: top; font-family: inherit; font-size: 14px; text-align: center; padding: 0 8px;" nowrap>
            <a href="${href}" target="_blank">
              <img src="${iconUrl}" border="0" width="156" height="38" alt="${buttonText}">
            </a>
        </td>
    `);
}

module.exports = {
    generateLinks,
    getTemplate
};
