/**
 * Turns Ghost's `%%{id}%%` replacement tokens into Mailgun `recipient-variables`.
 *
 * Mailgun's substitution is a plain string replace with no HTML awareness, and every part of the
 * message reads the same variables. Values a member controls therefore get a second, HTML-escaped
 * variable (`<id>_html`) that only the html body points at; the plaintext body and the subject use
 * the unescaped value. Trusted server-generated values (urls, uuids, hmacs) get no escaped copy, so
 * their URLs don't end up entity-encoded inside hrefs.
 */
import { escapeExpression } from 'handlebars';
import type { ReadonlyDeep } from 'type-fest';

type ReplacementDefinition = {
  id: string;
  token: RegExp;
  trusted?: boolean;
};

type Replacement = {
  id: string;
  value: unknown;
};

export type MessageFormat = 'html' | 'plaintext' | 'subject';

/** The ids that get an `_html` copy: those of the definitions that are not trusted */
export function getHtmlEscapedIds(
  replacementDefinitions: ReadonlyDeep<ReplacementDefinition[]>,
): Set<string> {
  return new Set(replacementDefinitions.filter((def) => !def.trusted).map((def) => def.id));
}

/** One recipient's variables; pass `htmlEscapedIds` from `getHtmlEscapedIds` */
export function createRecipientVariables(
  replacements: ReadonlyDeep<Replacement[]>,
  htmlEscapedIds: Readonly<Set<string>>,
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const { id, value } of replacements) {
    variables[id] = value;
    if (htmlEscapedIds.has(id)) {
      variables[`${id}_html`] = typeof value === 'string' ? escapeExpression(value) : value;
    }
  }

  return variables;
}

/** Replaces each token in one part of the message with the Mailgun variable that part should use */
export function replaceTokensWithRecipientVariables(
  content: string,
  replacementDefinitions: ReadonlyDeep<ReplacementDefinition[]>,
  format: MessageFormat,
): string {
  for (const def of replacementDefinitions) {
    const useHtmlVariant = format === 'html' && !def.trusted;
    content = content.replace(def.token, `%recipient.${def.id}${useHtmlVariant ? '_html' : ''}%`);
  }
  return content;
}
