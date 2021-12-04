module.exports = {
    render({payload, env: {dom}, options = {}}) {
        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card');

        let html = payload.html;
        // let template = 'media';

        if (options.target === 'email') {
            // Templates contain content in square brackets that should be dynamic (e.g. [image])

            // @TODO:
            // - @handlers and links in text should be blue and have break-all whitespace (see static example)
            // - \n in text should be replaced with <br>'s
            // - ideally, numbers should be formatted (e.g. 1,400 likes)

            html = `
            <table cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #E9E9E9; border-radius: 5px; width: auto; margin: 0 auto; width: 100%">
                <!-- [if media exists]  -->
                <tr>
                    <td align="center" style="width: 100%;">
                        <a href="https://twitter.com/twitter/status/[tweet.fields.id]"><img src="[media.fields.preview_image_url]" style="width: 100%; border: none; max-width: 560px;" border="0"></a>
                    </td>
                </tr>
                <!-- [/if] -->
                <tr>
                    <td>
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td width="48" style="width: 48px;">
                                    <a href="https://twitter.com/twitter/status/[tweet.fields.id]" class="kg-twitter-link" style="padding-left: 20px; padding-top: 20px;"><img src="[user.fields.profile_image_url]" style="max-width: 512px; border: none; width: 48px; height: 48px; border-radius: 999px;" border="0"></a>
                                </td>
                                <td style="line-height: 1.3em; width: 100%;">
                                    <a href="https://twitter.com/twitter/status/[tweet.fields.id]" class="kg-twitter-link" style="font-size: 15px !important; font-weight: 600; width: 100%; padding-top: 24px; padding-bottom: 18px;">[user.fields.name] <br> <span style="color: #ABB4BE; font-size: 14px; font-weight: 500;">[user.fields.username]</span></a>
                                </td>
                                <td align="right" width="24" style="width: 24px;">
                                    <a href="https://twitter.com/twitter/status/[tweet.fields.id]" class="kg-twitter-link" style="padding-right: 20px; padding-top: 24px; width: 24px; height: 38px;"><img src="https://static.ghost.org/v4.0.0/images/twitter-logo-small.png" width="24" border="0"></a>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="3">
                                    <a href="https://twitter.com/twitter/status/[tweet.fields.id]" class="kg-twitter-link" style="font-size: 15px; line-height: 1.4em; padding-top: 8px; padding-left: 20px; padding-right: 20px; padding-bottom: 20px;">[tweet.fields.text] Lorem ipsum dolor sit amet <span style="color: #1DA1F2;">@twitterhandle</span> and <span style="color: #1DA1F2; word-break: break-all;">https://example.com/this-is-a-long-url-that-might-probably-too-long-to-fit-in-a-line</span>
                                    <!-- [if poll exists]  -->
                                    <br><span style="color: #1DA1F2;">View poll &rarr;</span>
                                    <!-- -->
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="3" style="width: 100%;">
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #E9E9E9;">
                                        <tr>
                                            <td>
                                                <a href="https://twitter.com/twitter/status/[tweet.fields.id]" class="kg-twitter-link" style="padding-top: 20px; padding-bottom: 20px; padding-left: 20px;">
                                                    <span style="font-weight: 600;">[no of retweets]</span> <span style="color: #838383;">retweets &bull;</span>
                                                    <span style="font-weight: 600;">[no of likes]</span> <span style="color: #838383;">likes</span>
                                                </a>
                                            </td>
                                            <td align="right">
                                            <a href="https://twitter.com/twitter/status/[tweet.fields.id]" class="kg-twitter-link" style="padding-top: 20px; padding-bottom: 20px; padding-right: 20px;"><span style="color: #838383;">[date]</span></a>
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

