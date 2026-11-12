import { tokenize } from 'html5parser';
import * as entities from 'entities';

/**
 * Replaces the links in the provided HTML
 */
export const replace = async (
  html: string,
  replaceLink: (
    url: URL,
    originalPath: string,
  ) => URL | string | false | Promise<URL | string | false>,
  options: { base?: string } = {},
): Promise<string> => {
  try {
    const tokens = tokenize(html); // IToken[]
    const replacements = [];

    let inAnchor = false;
    let inHref = false;

    // interface IToken {
    //   start: number;
    //   end: number;
    //   value: string;
    //   type: TokenKind;
    // }

    // const enum TokenKind {
    // 0  Literal,
    // 1  OpenTag, // trim leading '<'
    // 2  OpenTagEnd, // trim tailing '>', only could be '/' or ''
    // 3  CloseTag, // trim leading '</' and tailing '>'
    // 4  Whitespace, // the whitespace between attributes
    // 5  AttrValueEq,
    // 6  AttrValueNq,
    // 7  AttrValueSq,
    // 8  AttrValueDq,
    // }

    for (const token of tokens) {
      if (token.type === 1 && token.value === 'a') {
        inAnchor = true;
      }

      if (inAnchor) {
        if (token.type === 2) {
          inAnchor = false;
          inHref = false;
        }

        if (token.type === 6 && token.value === 'href') {
          inHref = true;
        }

        if (inHref && token.type === 8) {
          const path = entities.decode(token.value.substring(1, token.value.length - 1));
          let url;
          try {
            url = new URL(path, options.base);
          } catch (e) {
            // Ignore invalid URLs
          }
          if (url) {
            const replacement = await replaceLink(url, path);
            const str = replacement.toString();
            replacements.push({ url: str, start: token.start + 1, end: token.end - 1 });
          }

          inHref = false;
        }
      }
    }

    let offsetAdjustment = 0;

    replacements.forEach(({ url, start, end }) => {
      const originalLength = end - start;
      const replacementLength = url.length;

      html = html.slice(0, start + offsetAdjustment) + url + html.slice(end + offsetAdjustment);

      offsetAdjustment += replacementLength - originalLength;
    });

    return html;
  } catch (e) {
    // do nothing in case of error,
    // we don't want to break the content for the sake of member attribution
    return html;
  }
};
