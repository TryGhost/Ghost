const {DateTime} = require('luxon');

module.exports = {
    render({payload, env: {dom}, options = {}}) {
        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card');

        let html = payload.html;
        // @TODO:
        // - \n in text should be replaced with <br>'s

        const tweetData = payload && payload.metadata && payload.metadata.tweet_data;

        if (tweetData) {
            const tweetId = tweetData.id;
            const numberFormatter = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                notation: 'compact',
                unitDisplay: 'narrow',
                maximumFractionDigits: 1
            });
            const retweetCount = numberFormatter.format(tweetData.public_metrics.retweet_count);
            const likeCount = numberFormatter.format(tweetData.public_metrics.like_count);
            const authorUser = tweetData.includes.users.find(user => user.id === tweetData.author_id);
            const tweetDate = DateTime.fromISO(tweetData.created_at).toLocaleString(DateTime.DATE_MED);

            const mentions = tweetData.entities && tweetData.entities.mentions || [];
            const urls = tweetData.entities && tweetData.entities.urls || [];
            const entities = mentions.concat(urls);
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
                for (const entity of entities) {
                    let type = 'text';
                    let data = tweetContent.slice(entity.start, entity.end + 1);
                    if (entity.url) {
                        type = 'url';
                    }
                    if (entity.username) {
                        type = 'mention';
                    }
                    parts.push({
                        type: 'text',
                        data: tweetContent.slice(last, entity.start)
                    });
                    parts.push({
                        type: type,
                        data: data
                    });
                    last = entity.end + 1;
                }
                parts.push({
                    type: 'text',
                    data: tweetContent.slice(last, tweetContent.length)
                });

                tweetContent = parts.reduce((content, part) => {
                    if (part.type === 'text') {
                        return content + part.data;
                    }
                    if (part.type === 'mention') {
                        return content + `<span style="color: #1DA1F2;">${part.data}</span>`;
                    }
                    if (part.type === 'url') {
                        return content + `<span style="color: #1DA1F2; word-break: break-all;">${part.data}</span>`;
                    }
                }, '');
            }

            if (options.target === 'email') {
                html = `
                <table cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #E9E9E9; border-radius: 5px; width: auto; margin: 0 auto; width: 100%">
                    ${hasImageOrVideo ? `<tr>
                        <td align="center" style="width: 100%;">
                            <a href="https://twitter.com/twitter/status/${tweetId}"><img src="${tweetImageUrl}" style="width: 100%; border: none; max-width: 560px;" border="0"></a>
                        </td>
                    </tr>` : ''}
                    <tr>
                        <td>
                            <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td width="48" style="width: 48px;">
                                        <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-left: 20px; padding-top: 20px;"><img src="${authorUser.profile_image_url}" style="max-width: 512px; border: none; width: 48px; height: 48px; border-radius: 999px;" border="0"></a>
                                    </td>
                                    <td style="line-height: 1.3em; width: 100%;">
                                        <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="font-size: 15px !important; font-weight: 600; width: 100%; padding-top: 24px; padding-bottom: 18px;">${authorUser.name} <br> <span style="color: #ABB4BE; font-size: 14px; font-weight: 500;">@${authorUser.username}</span></a>
                                    </td>
                                    <td align="right" width="24" style="width: 24px;">
                                        <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-right: 20px; padding-top: 24px; width: 24px; height: 38px;"><img src="https://static.ghost.org/v4.0.0/images/twitter-logo-small.png" width="24" border="0"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="3">
                                        <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="font-size: 15px; line-height: 1.4em; padding-top: 8px; padding-left: 20px; padding-right: 20px; padding-bottom: 20px;">${tweetContent}
                                        ${hasPoll ? `<br><span style="color: #1DA1F2;">View poll &rarr;</span>` : ''}
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="width: 100%;">
                                        <table cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #E9E9E9;">
                                            <tr>
                                                <td>
                                                    <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-top: 20px; padding-bottom: 20px; padding-left: 20px;">
                                                        <span style="font-weight: 600;">${retweetCount}</span> <span style="color: #838383;">retweets &bull;</span>
                                                        <span style="font-weight: 600;">${likeCount}</span> <span style="color: #838383;">likes</span>
                                                    </a>
                                                </td>
                                                <td align="right">
                                                <a href="https://twitter.com/twitter/status/${tweetId}" class="kg-twitter-link" style="padding-top: 20px; padding-bottom: 20px; padding-right: 20px;"><span style="color: #838383;">${tweetDate}</span></a>
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
        }

        figure.appendChild(dom.createRawHTMLSection(html));

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    }
};

