const juice = require('juice');
const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {
    hbs,
    dedent
} = require('../utils');

/**
<figure class="kg-card kg-bookmark-card">
  <a href="[URL]" class="kg-bookmark-container">
    <div class="kg-bookmark-content">
      <div class="kg-bookmark-title">[TITLE]</div>
      <div class="kg-bookmark-description">[DESCRIPTION]</div>
      <div class="kg-bookmark-metadata">
        <img src="[ICON]" class="kg-bookmark-icon">
        <span class="kg-bookmark-author">[AUTHOR]</span>
        <span class="kg-bookmark-publisher">[PUBLISHER]</span>
      </div>
    </div>
    <div class="kg-bookmark-thumbnail">
      <img src="[THUMBNAIL]">
    </div>
  </a>
</figure>
 */

let template;

module.exports = {
    name: 'bookmark',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.metadata || !payload.url || !payload.metadata.title) {
            return dom.createTextNode('');
        }

        if (!template) {
            // Outlook template has inline styles because it appears as a comment to
            // DOM-based tools like `juice` meaning stylesheets don't get inlined
            const outlookHtml = `
                <style>
                    .kg-bookmark-card--outlook {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        border: 1px solid #e5eff5;
                        background: #ffffff;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
                    }
                    .kg-bookmark-card--outlook a {
                        text-decoration: none;
                    }
                    .kg-bookmark-title--outlook a {
                        color: #15212A;
                        font-size: 15px;
                        line-height: 1.5em;
                        font-weight: 600;
                    }
                    .kg-bookmark-description--outlook a {
                        margin-top: 12px;
                        color: #738a94;
                        font-size: 13px;
                        line-height: 1.5em;
                        font-weight: 400;
                    }
                    .kg-bookmark-metadata--outlook {
                        padding-top: 14px;
                        color: #15212A;
                        font-size: 13px;
                        font-weight: 400;
                        line-height: 1.5em;
                    }
                    .kg-bookmark-metadata--outlook a {
                        color: #15212A;
                    }
                    .kg-bookmark-icon--outlook {
                        padding-right: 8px;
                        font-size: 0;
                        line-height: 1.5em
                    }
                    .kg-bookmark-spacer--outlook {
                        height: 1.5em;
                    }
                </style>
                <table class="kg-card kg-bookmark-card--outlook" style="border-collapse: collapse; border-spacing: 0;">
                    <tr>
                        <td width="100%" style="padding: 20px;">
                            <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                                <tr>
                                    <td class="kg-bookmark-title--outlook"><a href="{{url}}">{{metadata.title}}</a></td>
                                </tr>
                                <tr>
                                    <td><div class="kg-bookmark-description--outlook"><a href="{{url}}">{{metadata.description}}</a></div></td>
                                </tr>
                                <tr>
                                    <td class="kg-bookmark-metadata--outlook">
                                        <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                                            <tr>
                                                {{#if metadata.icon}}
                                                    <td valign="middle" class="kg-bookmark-icon--outlook">
                                                        <a href="{{url}}"><img src="{{metadata.icon}}" width="22" height="22" alt=" "></a>
                                                    </td>
                                                {{/if}}
                                                <td valign="middle" class="kg-bookmark-byline--outlook">
                                                    <a href="{{url}}">
                                                        {{metadata.publisher}}
                                                        {{#if metadata.author}}&nbsp;&#x2022;&nbsp;{{/if}}
                                                        {{metadata.author}}
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <div class="kg-bookmark-spacer--outlook">&nbsp;</div>
            `;
            const juicedOutlookHtml = juice(outlookHtml);

            // NOTE: Publisher and author classes are swapped for theme backwards-compatibility.
            template = hbs`
                {{#if isEmail}}<!--[if !mso !vml]-->{{/if}}
                <figure class="kg-card kg-bookmark-card{{#if caption}} kg-card-hascaption{{/if}}">
                    <a class="kg-bookmark-container" href="{{url}}">
                        <div class="kg-bookmark-content">
                            <div class="kg-bookmark-title">{{metadata.title}}</div>
                            <div class="kg-bookmark-description">{{metadata.description}}</div>
                            <div class="kg-bookmark-metadata">
                                {{#if metadata.icon}}<img class="kg-bookmark-icon" src="{{metadata.icon}}" alt="">{{/if}}
                                {{#if metadata.publisher}}<span class="kg-bookmark-author">{{metadata.publisher}}</span>{{/if}}
                                {{#if metadata.author}}<span class="kg-bookmark-publisher">{{metadata.author}}</span>{{/if}}
                            </div>
                        </div>
                        {{#if metadata.thumbnail}}
                            <div class="kg-bookmark-thumbnail"{{#if isEmail}} style="background-image: url('{{metadata.thumbnail}}')"{{/if}}>
                                <img src="{{metadata.thumbnail}}" alt="">
                            </div>
                        {{/if}}
                    </a>
                    {{#if caption}}
                        <figcaption>{{{caption}}}</figcaption>
                    {{/if}}
                </figure>
                {{#if isEmail}}
                    <!--[endif]-->
                    <!--[if vml]>
                    ${juicedOutlookHtml}
                    <![endif]-->
                {{/if}}
            `;
        }

        const templateData = Object.assign({}, payload, {isEmail: options.target === 'email'});

        return dom.createRawHTMLSection(dedent(template(templateData)));
    },

    absoluteToRelative(payload, options) {
        if (payload.url) {
            payload.url = payload.url && absoluteToRelative(payload.url, options.siteUrl, options);
        }
        if (payload.metadata) {
            ['url', 'icon', 'thumbnail'].forEach((attr) => {
                if (payload.metadata[attr]) {
                    payload.metadata[attr] = absoluteToRelative(payload.metadata[attr], options.siteUrl, options);
                }
            });
        }
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        if (payload.url) {
            payload.url = payload.url && relativeToAbsolute(payload.url, options.siteUrl, options.itemUrl, options);
        }
        if (payload.metadata) {
            ['url', 'icon', 'thumbnail'].forEach((attr) => {
                if (payload.metadata[attr]) {
                    payload.metadata[attr] = relativeToAbsolute(payload.metadata[attr], options.siteUrl, options.itemUrl, options);
                }
            });
        }
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        if (payload.url) {
            payload.url = payload.url && toTransformReady(payload.url, options.siteUrl, options.itemUrl, options);
        }
        if (payload.metadata) {
            ['url', 'icon', 'thumbnail'].forEach((attr) => {
                if (payload.metadata[attr]) {
                    payload.metadata[attr] = toTransformReady(payload.metadata[attr], options.siteUrl, options.itemUrl, options);
                }
            });
        }
        payload.caption = payload.caption && htmlToTransformReady(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
