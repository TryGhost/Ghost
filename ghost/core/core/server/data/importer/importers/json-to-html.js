const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);
const imageCard = require('@tryghost/kg-default-cards/lib/cards/image.js');
const embedCard = require('@tryghost/kg-default-cards/lib/cards/embed.js');

// Take the array of items for a specific post and return the converted HTML
const itemsToHtml = (items) => {
    let itemHTMLChunks = [];
    items.forEach((item) => {
        let type = item.item_type;

        if (type === 'header') {
            itemHTMLChunks.push(`<h3>${item.title}</h3>`);
        } else if (type === 'text') {
            itemHTMLChunks.push(item.description); // THis is basic text HTML with <p>, <b>, <a>, etc (no media)
        } else if (type === 'image') {
            // We have 2 values to work with here. `image` is smaller and most suitable, and `original_image_url` is the full-res that would need to be resized
            // - item.image (https://s3.amazonaws.com/revue/items/images/019/005/542/web/anita-austvika-C-JUrfmYqcw-unsplash.jpg?1667924147)
            // - item.original_image_url (https://s3.amazonaws.com/revue/items/images/019/005/542/original/anita-austvika-C-JUrfmYqcw-unsplash.jpg?1667924147)
            let cardOpts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    src: item.image,
                    caption: item.description
                }
            };

            itemHTMLChunks.push(serializer.serialize(imageCard.render(cardOpts)));
        } else if (type === 'link') {
            // This could be a bookmark, or it could be a paragraph of text with a linked header, there's no way to tell
            // The safest option here is to output an image with text under it
            let cardOpts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    src: item.image,
                    caption: item.title,
                    href: item.url
                }
            };
            itemHTMLChunks.push(serializer.serialize(imageCard.render(cardOpts)));

            let linkHTML = `<h4><a href="${item.url}">${item.title}</a></h4>${item.description}`;
            itemHTMLChunks.push(linkHTML);
        } else if (type === 'tweet') {
            // Should this be an oEmbed call? Probably.
            itemHTMLChunks.push(`<figure class="kg-card kg-embed-card">
                <blockquote class="twitter-tweet"><a href="${item.url}"></a></blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                </figure>`);
        } else if (type === 'video') {
            const isLongYouTube = /youtube.com/.test(item.url);
            const isShortYouTube = /youtu.be/.test(item.url);
            const isVimeo = /vimeo.com/.test(item.url);
            let videoHTML = '';
            if (isLongYouTube) {
                let videoID = item.url.replace(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]*)/gi, '$1');
                videoHTML = `<iframe width="200" height="113" src="https://www.youtube.com/embed/${videoID}?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            } else if (isShortYouTube) {
                let videoID = item.url.replace(/https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]*)/gi, '$1');
                videoHTML = `<iframe width="200" height="113" src="https://www.youtube.com/embed/${videoID}?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            } else if (isVimeo) {
                let videoID = item.url.replace(/https?:\/\/(?:www\.)?vimeo\.com\/([0-9]+)/gi, '$1');
                videoHTML = `<iframe src="https://player.vimeo.com/video/${videoID}" width="200" height="113" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
            }
            let cardOpts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    html: videoHTML,
                    caption: item.description
                }
            };

            itemHTMLChunks.push(serializer.serialize(embedCard.render(cardOpts)));
        }
    });
    return itemHTMLChunks.join('\n');
};

const getPostDate = (data) => {
    const isPublished = (data.sent_at) ? true : false; // This is how we determine is a post is published or not
    const postDate = (isPublished) ? new Date(data.sent_at) : new Date();

    return postDate.toISOString();
};

const getPostStatus = (data) => {
    const isPublished = (data.sent_at) ? true : false; // This is how we determine is a post is published or not
    return (isPublished) ? 'published' : 'draft';
};

const cleanCsvHTML = (data) => {
    // Blockquotes need to have some sort of wrapping elements around all contents
    // Wrap all content in <p> tags. The HTML to Mobiledoc parse can handle duplicate <p> tags.
    data = data.replace(/<blockquote.*?>(.*?)<\/blockquote>/gm, '<blockquote><p>$1</p></blockquote>');

    // These exports have a lot of <p><br></p> that we don't want
    data = data.replace(/<p><br><\/p>/gm, '');

    return data;
};

module.exports = {
    itemsToHtml,
    getPostDate,
    getPostStatus,
    cleanCsvHTML
};
