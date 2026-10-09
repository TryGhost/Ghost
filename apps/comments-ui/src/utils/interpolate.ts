import type { ComponentChildren } from 'preact';

type Replacement = ComponentChildren | ((content: string) => ComponentChildren);

const TOKEN = /\{(\w+)\}|<(\w+)>(.*?)<\/\2>/g;

/**
 * Replaces `{name}` placeholders and `<name>content</name>` tags in a translated string.
 * Tag replacements are called with the text between the tags.
 */
export function interpolate(text: string, replacements: Record<string, Replacement>) {
  const parts: ComponentChildren[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOKEN)) {
    const [token, placeholder, tag, content] = match;
    const replacement = replacements[placeholder ?? tag];
    if (replacement === undefined) {
      continue;
    }

    parts.push(text.slice(lastIndex, match.index));
    parts.push(typeof replacement === 'function' ? replacement(content) : replacement);
    lastIndex = match.index + token.length;
  }

  parts.push(text.slice(lastIndex));
  return parts;
}
