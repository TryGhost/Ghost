const maxAuthJsonCharacters = 256 * 1024;
const maxAccessTokenCharacters = 64 * 1024;

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function accessToken(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const token = value.trim();
  return token && token.length <= maxAccessTokenCharacters ? token : undefined;
}

export function codexAccessTokenFromAuthJson(authJson: string): string {
  if (authJson.length > maxAuthJsonCharacters) {
    throw new Error('The Codex auth.json file is too large.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(authJson);
  } catch {
    throw new Error('Paste a valid Codex auth.json file.');
  }

  const root = objectValue(parsed);
  const cliTokens = objectValue(root?.tokens);
  const piCredential = objectValue(root?.['openai-codex']);
  const directPiCredential = root?.type === 'oauth' ? root : undefined;
  const token =
    accessToken(cliTokens?.access_token) ??
    (piCredential?.type === 'oauth' ? accessToken(piCredential.access) : undefined) ??
    accessToken(directPiCredential?.access);

  if (!token) {
    throw new Error('The file does not contain a Codex access token.');
  }
  return token;
}
