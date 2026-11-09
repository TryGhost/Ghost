/**
 * Apps' cards in a feed: each becomes its email version, or a link to the post. The site shows
 * them in frames, which feed readers can't. The HTML has already been through the posts mapper,
 * so cards whose app is gone were dropped and the email version holds only allowed origins.
 *
 * @param {string} html
 * @param {string} postUrl
 * @returns {string}
 */
function cardsForFeed(html, postUrl) {
  if (!html.includes('kg-app-card')) {
    return html;
  }
  const cheerio = require('cheerio/slim');
  const $ = cheerio.load(html, null, false);
  $('figure.kg-app-card').each((_index, element) => {
    const figure = $(element);
    const email = cheerio.load(
      figure.children('template.kg-app-card-email').html() ?? '',
      null,
      false,
    );
    email('a[data-ghost-post-link]').attr('href', postUrl).removeAttr('data-ghost-post-link');
    const markup = email.html().trim();
    if (markup) {
      figure.replaceWith(`<div class="kg-card kg-app-card">${markup}</div>`);
    } else {
      const link = $('<a></a>').attr('href', postUrl).text('View this on the web');
      figure.replaceWith($('<p></p>').append(link));
    }
  });
  return $.html();
}

module.exports = { cardsForFeed };
