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

    html = html.replace(new RegExp(templateStrings.like, 'g'), positiveLink.href);
    html = html.replace(new RegExp(templateStrings.dislike, 'g'), negativeLink.href);

    return html;
};

const getTemplate = (accentColor) => {
    const likeButtonHtml = getButtonHtml(
        templateStrings.like,
        'More like this',
        accentColor,
        'like-icon',
        'https://static.ghost.org/v5.0.0/images/thumbs-up.png'
    );
    const dislikeButtonHtml = getButtonHtml(
        templateStrings.dislike,
        'Less like this',
        accentColor,
        'dislike-icon',
        'https://static.ghost.org/v5.0.0/images/thumbs-down.png'
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

function getButtonHtml(href, buttonText, accentColor, className, iconUrl) {
    const bgColor = getButtonLightTheme(accentColor).backgroundColor;
    const textColor = getButtonLightTheme(accentColor).color;
    const buttonAttr = {
        width: 100,
        height: 38,
        iconWidth: 24
    };

    // Sizes defined in pixels won’t be adjusted when Outlook is rendering at 120 dpi.
    // To solve the problem we use values in points (1 pixel = 0.75 point).
    // resource: https://www.hteumeuleu.com/2021/background-properties-in-vml/
    const buttonAttrOutlook = {
        width: (buttonAttr.width + buttonAttr.iconWidth) * 0.75,
        height: buttonAttr.height * 0.75 + 1,
        iconWidth: buttonAttr.iconWidth * 0.75
    };

    return (`
         <td dir="ltr" valign="top" align="center" style="vertical-align: top; color: ${textColor}; font-family: inherit; font-size: 14px; text-align: center; padding: 0 8px;" nowrap>
            <table class="feedback-buttons" align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${bgColor}; overflow: hidden; border-radius: 22px;border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                <tr>
                    <td width="16" height="${buttonAttr.height}"></td>
                    <td class=${className} background=${iconUrl} bgcolor="${textColor}" width="${buttonAttr.iconWidth}" height="${buttonAttr.height}" valign="top" style="background-image: url(${iconUrl});vertical-align: middle; text-align: center;background-size: cover; background-position: 0 50%; background-repeat:no-repeat;">
                        <!--[if gte mso 9]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${buttonAttrOutlook.iconWidth}pt;height:${buttonAttrOutlook.height}pt;">
                            <v:fill origin="0.5, 0.5" position="0.5, 0.5" type="tile" src=${iconUrl} color="${textColor}" size="1,1" aspect="atleast" />
                            <v:textbox inset="0,0,0,0">
                        <![endif]-->
                        <div>
                            <a style="background-color: ${bgColor};border: none; width: ${buttonAttr.iconWidth}px; height: ${buttonAttr.height}px; display: block" href=${href} target="_blank"></a>
                        </div>
                        <!--[if gte mso 9]>
                        </v:textbox>
                        </v:rect>
                        <![endif]-->
                    </td>
                    <td style="text-align: right;font-size: 18px; vertical-align: middle; color: ${textColor}!important; background-position: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
                        <div style="color: ${textColor}"><!--[if mso]>
                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href=${href} style="height:${buttonAttrOutlook.height}pt;v-text-anchor:middle;width:${buttonAttrOutlook.width}pt;" stroke="f">
                                <w:anchorlock/>
                                <center>
                            <![endif]-->
                            <a
                              href=${href}
                              target="_blank"
                              style="padding: 0 8px 0 8px;border-radius: 0 22px 22px 0;color:${textColor}!important;display:inline-block;font-family: inherit;font-size:14px;font-weight:bold;line-height:38px;text-align:left;text-decoration:none;width:100px;-webkit-text-size-adjust:none;">
                              ${buttonText}</a>
                            <!--[if mso]>
                            </center>
                            </v:rect>
                            <![endif]--></div>
                    </td>
                </tr>
            </table>
        </td>
    `);
}

function getButtonLightTheme(accentColor) {
    const color = new Color(accentColor);
    const backgroundColor = `${accentColor}10`;
    const textColor = color.darken(0.6).hex();

    return {
        color: textColor,
        backgroundColor
    };
}

function getButtonsHeadStyles() {
    return (`
        .like-icon {
            mix-blend-mode: darken;
        }

        .dislike-icon {
            mix-blend-mode: darken;
        }

        @media (prefers-color-scheme: dark) {
            .like-icon {
                mix-blend-mode: initial !important;
            }

            .dislike-icon {
                mix-blend-mode: initial !important;
            }
        }
`);
}

module.exports = {
    generateLinks,
    getTemplate,
    getButtonsHeadStyles
};
