/**
 * Parse Context
 *
 * Utility function, to expand strings out into objects.
 */
export default function parseContext(rawContext?: unknown): ParsedContext {
  // Strings carry no fields, so reading one off 'internal' is undefined
  const context = rawContext as Partial<ParsedContext> | undefined;
  const parsed: ParsedContext = {
    internal: false,
    user: null,
    api_key: null,
    integration: null,
    member: null,
    public: true,
  };

  if (context && (rawContext === 'internal' || context.internal)) {
    parsed.internal = true;
    parsed.public = false;
  }

  if (context && context.user) {
    parsed.user = context.user;
    parsed.public = false;
  }

  if (context && context.api_key) {
    parsed.api_key = context.api_key;
    parsed.integration = context.integration;
    parsed.public = context.api_key.type === 'content';
  }

  if (context && context.member) {
    parsed.member = context.member;
  }

  return parsed;
}

/** A normalized `frame.options.context` */
export interface ParsedContext {
  internal: boolean;
  user: string | null;
  api_key: { id: string; type: string } | null;
  integration: unknown;
  member: unknown;
  public: boolean;
}
