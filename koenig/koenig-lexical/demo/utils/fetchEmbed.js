export async function fetchEmbed(url, {type}) {
    let urlObject = new URL(url);
    if (!urlObject) {
        throw new Error('No URL specified.');
    }
    try {
        await delay(1500);
        // let html = await (await fetch(url)).text();

        if (type === 'bookmark') {
            let returnData = {
                url: 'https://www.ghost.org/',
                metadata: {
                    icon: 'https://www.ghost.org/favicon.ico',
                    title: 'Ghost: The Creator Economy Platform',
                    description: 'The former of the two songs addresses the issue of negative rumors in a relationship, while the latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped bridge.',
                    publisher: 'Ghost - The Professional Publishing Platform',
                    author: 'Author McAuthory',
                    thumbnail: 'https://ghost.org/images/meta/ghost.png'
                }
            };
            return returnData;
        } else {
            // let returnData = {
            //     url: 'https://twitter.com/Ghost/status/1630581157568839683',
            //     author_name: 'Ghost',
            //     author_url: 'https://twitter.com/Ghost',
            //     // html: '<blockquote class=\'twitter-tweet\'><p lang=\'en\' dir=\'ltr\'>With the decline of traditional local news outlets, publishers like <a href=\'https://twitter.com/MadisonMinutes?ref_src=twsrc%5Etfw\'>@MadisonMinutes</a>, <a href=\'https://twitter.com/RANGEMedia4all?ref_src=twsrc%5Etfw\'>@RANGEMedia4all</a>, and <a href=\'https://twitter.com/sfsimplified?ref_src=twsrc%5Etfw\'>@sfsimplified</a> are leading the charge in creating sustainable, community-driven journalism through websites and newsletters.<br><br>Check out their impact 👇<a href=\'https://t.co/RdNNyY18Iv\'>https://t.co/RdNNyY18Iv</a></p>&mdash; Ghost (@Ghost) <a href=\'https://twitter.com/Ghost/status/1630581157568839683?ref_src=twsrc%5Etfw\'>February 28, 2023</a></blockquote>\n<script async src=\'https://platform.twitter.com/widgets.js\' charset=\'utf-8\'></script>\n',
            //     width: 550,
            //     height: null,
            //     type: 'twitter',
            //     cache_age: '3153600000',
            //     provider_name: 'Twitter',
            //     provider_url: 'http://www.twitter.com/',
            //     version: '1.0',
            //     tweet_data: {
            //         reply_settings: 'everyone',
            //         context_annotations: [
            //             {
            //                 domain: {
            //                     id: '46',
            //                     name: 'Business Taxonomy',
            //                     description: 'Categories within Brand Verticals that narrow down the scope of Brands'
            //                 },
            //                 entity: {
            //                     id: '1557697121477832705',
            //                     name: 'Publisher & News Business',
            //                     description: 'Brands, companies, advertisers and every non-person handle with the profit intent related to  marketing and advertiser agencies, publishers of magazines, newspapers, blogs, books'
            //                 }
            //             },
            //             {
            //                 domain: {
            //                     id: '131',
            //                     name: 'Unified Twitter Taxonomy',
            //                     description: 'A taxonomy of user interests. '
            //                 },
            //                 entity: {
            //                     id: '1046545033657081857',
            //                     name: 'News',
            //                     description: 'News'
            //                 }
            //             },
            //             {
            //                 domain: {
            //                     id: '131',
            //                     name: 'Unified Twitter Taxonomy',
            //                     description: 'A taxonomy of user interests. '
            //                 },
            //                 entity: {
            //                     id: '1196447117297905665',
            //                     name: 'News outlets'
            //                 }
            //             },
            //             {
            //                 domain: {
            //                     id: '131',
            //                     name: 'Unified Twitter Taxonomy',
            //                     description: 'A taxonomy of user interests. '
            //                 },
            //                 entity: {
            //                     id: '1237072960952750081',
            //                     name: 'Journalism'
            //                 }
            //             },
            //             {
            //                 domain: {
            //                     id: '131',
            //                     name: 'Unified Twitter Taxonomy',
            //                     description: 'A taxonomy of user interests. '
            //                 },
            //                 entity: {
            //                     id: '1278000653416099840',
            //                     name: 'Writing'
            //                 }
            //             }
            //         ],
            //         conversation_id: '1630581157568839683',
            //         lang: 'en',
            //         text: 'With the decline of traditional local news outlets, publishers like @MadisonMinutes, @RANGEMedia4all, and @sfsimplified are leading the charge in creating sustainable, community-driven journalism through websites and newsletters.\n\nCheck out their impact 👇\nhttps://t.co/RdNNyY18Iv',
            //         possibly_sensitive: false,
            //         entities: {
            //             mentions: [
            //                 {
            //                     start: 68,
            //                     end: 83,
            //                     username: 'MadisonMinutes',
            //                     id: '1371572739333632001'
            //                 },
            //                 {
            //                     start: 85,
            //                     end: 100,
            //                     username: 'RANGEMedia4all',
            //                     id: '1448389854207770627'
            //                 },
            //                 {
            //                     start: 106,
            //                     end: 119,
            //                     username: 'sfsimplified',
            //                     id: '1351509902548738048'
            //                 }
            //             ],
            //             urls: [
            //                 {
            //                     start: 256,
            //                     end: 279,
            //                     url: 'https://t.co/RdNNyY18Iv',
            //                     expanded_url: 'https://ghost.org/resources/independent-local-news',
            //                     display_url: 'ghost.org/resources/inde…',
            //                     status: 200,
            //                     title: 'How to build an independent local news product',
            //                     description: 'In the face of a local news crisis community reporters and activists are building a more sustainable model for the future.',
            //                     unwound_url: 'https://ghost.org/resources/independent-local-news/'
            //                 }
            //             ]
            //         },
            //         id: '1630581157568839683',
            //         author_id: '767545134',
            //         edit_history_tweet_ids: [
            //             '1630581157568839683'
            //         ],
            //         public_metrics: {
            //             retweet_count: 10,
            //             reply_count: 2,
            //             like_count: 38,
            //             quote_count: 6,
            //             impression_count: 10774
            //         },
            //         created_at: '2023-02-28T14:50:17.000Z',
            //         includes: {
            //             users: [
            //                 {
            //                     username: 'Ghost',
            //                     entities: {
            //                         url: {
            //                             urls: [
            //                                 {
            //                                     start: 0,
            //                                     end: 23,
            //                                     url: 'https://t.co/iXNQIjvgGn',
            //                                     expanded_url: 'https://ghost.org',
            //                                     display_url: 'ghost.org'
            //                                 }
            //                             ]
            //                         }
            //                     },
            //                     description: 'Turn your audience into a business. Publishing, newsletters, memberships and subscriptions — all in one place. Decentralised. Open source. 0% payment fees.',
            //                     name: 'Ghost',
            //                     verified: true,
            //                     public_metrics: {
            //                         followers_count: 48596,
            //                         following_count: 2497,
            //                         tweet_count: 5200,
            //                         listed_count: 1021
            //                     },
            //                     profile_image_url: 'https://pbs.twimg.com/profile_images/1371800080383086594/71mdHnyD_normal.png',
            //                     protected: false,
            //                     created_at: '2012-08-19T13:15:12.000Z',
            //                     id: '767545134',
            //                     url: 'https://t.co/iXNQIjvgGn'
            //                 },
            //                 {
            //                     username: 'MadisonMinutes',
            //                     entities: {
            //                         url: {
            //                             urls: [
            //                                 {
            //                                     start: 0,
            //                                     end: 23,
            //                                     url: 'https://t.co/0InN5XAtid',
            //                                     expanded_url: 'https://www.madisonminutes.com/',
            //                                     display_url: 'madisonminutes.com'
            //                                 }
            //                             ]
            //                         },
            //                         description: {
            //                             mentions: [
            //                                 {
            //                                     start: 78,
            //                                     end: 86,
            //                                     username: 'hksperl'
            //                                 },
            //                                 {
            //                                     start: 91,
            //                                     end: 105,
            //                                     username: 'samhoisington'
            //                                 }
            //                             ]
            //                         }
            //                     },
            //                     pinned_tweet_id: '1415358597840637957',
            //                     description: 'A newsletter about news and events in Madison. Sent every weekday. Written by @hksperl and @samhoisington. Open DMs.',
            //                     name: 'Madison Minutes',
            //                     verified: false,
            //                     public_metrics: {
            //                         followers_count: 1112,
            //                         following_count: 432,
            //                         tweet_count: 1158,
            //                         listed_count: 16
            //                     },
            //                     profile_image_url: 'https://pbs.twimg.com/profile_images/1428114662625787906/5gpVJ-lY_normal.jpg',
            //                     protected: false,
            //                     created_at: '2021-03-15T21:23:26.000Z',
            //                     id: '1371572739333632001',
            //                     location: 'Madison, Wisconsin',
            //                     url: 'https://t.co/0InN5XAtid'
            //                 },
            //                 {
            //                     username: 'RANGEMedia4all',
            //                     entities: {
            //                         url: {
            //                             urls: [
            //                                 {
            //                                     start: 0,
            //                                     end: 23,
            //                                     url: 'https://t.co/yMkwEJZaWk',
            //                                     expanded_url: 'http://www.rangemedia.co',
            //                                     display_url: 'rangemedia.co'
            //                                 }
            //                             ]
            //                         }
            //                     },
            //                     pinned_tweet_id: '1564396110734839808',
            //                     description: 'News, analysis and conversations for people who love the Inland Northwest and want to make it better.\nIndependent & worker-owned.',
            //                     name: 'RANGE',
            //                     verified: false,
            //                     public_metrics: {
            //                         followers_count: 1394,
            //                         following_count: 128,
            //                         tweet_count: 1144,
            //                         listed_count: 16
            //                     },
            //                     profile_image_url: 'https://pbs.twimg.com/profile_images/1448390009141161986/RwlrqfBF_normal.jpg',
            //                     protected: false,
            //                     created_at: '2021-10-13T20:47:16.000Z',
            //                     id: '1448389854207770627',
            //                     location: 'Spokane',
            //                     url: 'https://t.co/yMkwEJZaWk'
            //                 },
            //                 {
            //                     username: 'sfsimplified',
            //                     entities: {
            //                         url: {
            //                             urls: [
            //                                 {
            //                                     start: 0,
            //                                     end: 23,
            //                                     url: 'https://t.co/XniGwUpkN9',
            //                                     expanded_url: 'https://www.sfsimplified.com/',
            //                                     display_url: 'sfsimplified.com'
            //                                 }
            //                             ]
            //                         }
            //                     },
            //                     description: `Journalist Megan Raposa brings smarter, easier local news about the forces that shape Sioux Falls directly to your inbox weekly. It's that simple.`,
            //                     name: 'Sioux Falls Simplified',
            //                     verified: false,
            //                     public_metrics: {
            //                         followers_count: 1143,
            //                         following_count: 212,
            //                         tweet_count: 532,
            //                         listed_count: 11
            //                     },
            //                     profile_image_url: 'https://pbs.twimg.com/profile_images/1511756949108531202/TdycY9QV_normal.jpg',
            //                     protected: false,
            //                     created_at: '2021-01-19T13:45:17.000Z',
            //                     id: '1351509902548738048',
            //                     location: 'Sioux Falls, SD',
            //                     url: 'https://t.co/XniGwUpkN9'
            //                 }
            //             ]
            //         }
            //     }
            // };
            let returnData = {
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
                thumbnail_width: 480,
                width: 480,
                author_url: 'https://www.youtube.com/user/gorillaz',
                height: 270,
                thumbnail_height: 360,
                provider_name: 'YouTube',
                title: 'Gorillaz - Humility (Official Video)',
                provider_url: 'https://www.youtube.com/',
                author_name: 'Gorillaz',
                version: '1.0',
                thumbnail_url: 'https://i.ytimg.com/vi/E5yFcdPAGv0/hqdefault.jpg',
                type: 'video'
            };
            return returnData;
        }
    } catch (e) {
        // console.log(e);
    }
}

function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
