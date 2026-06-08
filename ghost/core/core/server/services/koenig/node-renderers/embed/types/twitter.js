const {DateTime} = require('luxon');
const _ = require('lodash');

function render(node, document, options) {
    const metadata = node.metadata;

    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-embed-card');

    let html = node.html;

    const tweetData = metadata && metadata.tweet_data;
    const isEmail = options.target === 'email';

    if (tweetData && isEmail) {
        const tweetId = tweetData.id;
        const numberFormatter = new Intl.NumberFormat('en-US', {
            style: 'decimal',
            notation: 'compact',
            unitDisplay: 'narrow',
            maximumFractionDigits: 1
        });
        const retweetCount = numberFormatter.format(tweetData.public_metrics.retweet_count);
        const likeCount = numberFormatter.format(tweetData.public_metrics.like_count);
        const authorUser = tweetData.users && tweetData.users.find(user => user.id === tweetData.author_id);
        const tweetTime = DateTime.fromISO(tweetData.created_at).toLocaleString(DateTime.TIME_SIMPLE);
        const tweetDate = DateTime.fromISO(tweetData.created_at).toLocaleString(DateTime.DATE_MED);

        const mentions = tweetData.entities && tweetData.entities.mentions || [];
        const urls = tweetData.entities && tweetData.entities.urls || [];
        const hashtags = tweetData.entities && tweetData.entities.hashtags || [];
        const entities = mentions.concat(urls).concat(hashtags).sort((a, b) => a.start - b.start);
        let tweetContent = tweetData.text;

        let tweetImageUrl = null;
        const hasImageOrVideo = tweetData.attachments && tweetData.attachments && tweetData.attachments.media_keys;
        if (hasImageOrVideo) {
            tweetImageUrl = tweetData.includes.media[0].preview_image_url || tweetData.includes.media[0].url;
        }
        const hasPoll = tweetData.attachments && tweetData.attachments && tweetData.attachments.poll_ids;

        if (mentions) {
            let last = 0;
            let parts = [];
            let content = _.toArray(tweetContent);
            for (const entity of entities) {
                let type = 'text';
                let data = content.slice(entity.start, entity.end + 1).join('').replace(/\n/g, '<br>');
                if (entity.url) {
                    if (!entity.display_url || entity.display_url.startsWith('pic.twitter.com')) {
                        type = 'img_url';
                    } else {
                        type = 'url';
                        data = data.replace(entity.url, entity.display_url);
                    }
                }
                if (entity.username) {
                    type = 'mention';
                }
                if (entity.tag) {
                    type = 'hashtag';
                }
                parts.push({
                    type: 'text',
                    data: content.slice(last, entity.start).join('').replace(/\n/g, '<br>')
                });
                parts.push({
                    type: type,
                    data: data
                });
                last = entity.end + 1;
            }
            parts.push({
                type: 'text',
                data: content.slice(last, content.length).join('').replace(/\n/g, '<br>')
            });

            tweetContent = parts.reduce((partContent, part) => {
                if (part.type === 'text') {
                    return partContent + part.data;
                }
                if (part.type === 'mention') {
                    return partContent + `<span style="color: #1DA1F2;">${part.data}</span>`;
                }
                if (part.type === 'hashtag') {
                    return partContent + `<span style="color: #1DA1F2;">${part.data}</span>`;
                }
                if (part.type === 'url') {
                    return partContent + `<span style="color: #1DA1F2; word-break: break-all;">${part.data}</span>`;
                }
                return partContent;
            }, '');
        }

        html = `
        <table cellspacing="0" cellpadding="0" border="0" class="kg-twitter-card">
            <tr>
                <td>
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        ${authorUser ? `
                            <tr>
                                ${authorUser.profile_image_url ? `<td width="48" style="width: 48px;">
                                    <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-left: 16px; padding-top: 16px;"><img src="${authorUser.profile_image_url}" style="max-width: 512px; border: none; width: 48px; height: 48px; border-radius: 999px;" border="0"></a>
                                </td>` : ''}
                                ${authorUser.name ? `
                                <td style="line-height: 1.3em; width: 100%;">
                                    <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="font-size: 15px !important; font-weight: 600; width: 100%; padding-top: 20px; padding-bottom: 18px;">${authorUser.name} <br> <span style="color: #ABB4BE; font-size: 14px; font-weight: 500;">@${authorUser.username}</span></a>
                                </td>` : ''}
                                <td align="right" width="24" style="width: 24px;">
                                    <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-right: 16px; padding-top: 20px; width: 24px; height: 38px;"><img src="https://static.ghost.org/v4.0.0/images/twitter-logo-small.png" width="24" border="0"></a>
                                </td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td colspan="3">
                                <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="font-size: 15px; line-height: 1.4em; padding-top: 8px; padding-left: 16px; padding-right: 16px; padding-bottom: 16px;">${tweetContent}
                                ${hasPoll ? `<br><span style="color: #1DA1F2;">View poll &rarr;</span>` : ''}
                                </a>
                            </td>
                        </tr>
                        ${hasImageOrVideo ? `<tr>
                            <td colspan="3" align="center" style="width: 100%;">
                                <a href="https://twitter.com/twitter/status/${tweetId}" style="display: block; padding-top: 0; padding-left: 16px; padding-right: 16px; padding-bottom: 0;"><img src="${tweetImageUrl}" style="width: 100%; border: 1px solid #E9E9E9; max-width: 528px; border-radius: 10px;" border="0"></a>
                            </td>
                        </tr>` : ''}
                        <tr>
                            <td colspan="3" style="width: 100%;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td>
                                        <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-top: 4px; padding-right: 16px; padding-bottom: 12px; padding-left: 16px;"><span style="color: #838383;">${tweetTime} &bull; ${tweetDate}</span></a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="3" style="width: 100%;">
                                <table cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #E9E9E9;">
                                    <tr>
                                        <td>
                                            <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-top: 12px; padding-right: 16px; padding-bottom: 12px; padding-left: 16px;">
                                                <span style="font-weight: 600;">${likeCount}</span> <span style="color: #838383;">likes &bull;</span>
                                                <span style="font-weight: 600;">${retweetCount}</span> <span style="color: #838383;">retweets</span>
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
        `;
    }

    figure.innerHTML = html.trim();

    const caption = node.caption;
    if (caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.innerHTML = caption;
        figure.appendChild(figcaption);
        figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
    }

    return {element: figure};
}

module.exports = render;
