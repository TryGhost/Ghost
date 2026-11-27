import * as cheerio from 'cheerio/slim';
// @ts-expect-error This module currently lacks type definitions.
import htmlToPlaintext from '@tryghost/html-to-plaintext';
import { inlineCss } from './inline-css';

const finalizeHtml = (html: string): string => {
  // Add a class to each figcaption so we can style them in the email.
  let $ = cheerio.load(html, null, false);
  $('figcaption').addClass('kg-card-figcaption');
  html = $.html();

  const juicedHtml = inlineCss(html);

  // Many email clients, like Outlook and Yahoo, [lack support for <figure>
  // and <figcaption>][0]. To work around this, change the tags to <div>s.
  // Juice should have properly styled them.
  //
  // [0]: https://www.caniemail.com/features/html-semantics/
  $ = cheerio.load(juicedHtml, null, false);
  $('figure, figcaption').each((_, el) => {
    el.tagName = 'div';
  });

  // Fix characters unsupported in some Outlook versions.
  html = $.html();
  html = html.replace(/&apos;/g, '&#39;');
  html = html.replace(/→/g, '&rarr;');
  html = html.replace(/–/g, '&ndash;');
  html = html.replace(/“/g, '&ldquo;');
  html = html.replace(/”/g, '&rdquo;');

  return html;
};

export const finalize = (html: string): { html: string; plaintext: string } => {
  const resultHtml = finalizeHtml(html);
  return { html: resultHtml, plaintext: htmlToPlaintext.email(resultHtml) };
};
