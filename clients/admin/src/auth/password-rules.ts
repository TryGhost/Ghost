import validator from 'validator';

const INSECURE_PASSWORDS = [
  '1234567890',
  'qwertyuiop',
  'qwertzuiop',
  'asdfghjkl;',
  'abcdefghij',
  '0987654321',
  '1q2w3e4r5t',
  '12345asdfg',
];
const COMMON_PHRASES = ['ghost', 'password', 'passw0rd'];

interface PasswordContext {
  email: string;
  siteTitle?: string;
  /** The site URL, compared without its protocol; defaults to the admin's host. */
  siteUrl?: string;
}

/** Half or more of the characters being the same one. */
const isRepetitive = (password: string) => {
  const counts = new Map<string, number>();
  for (const char of password.split('')) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= password.length / 2);
};

/**
 * Every rule the password breaks, in the order they are checked; empty when it
 * is acceptable. The server enforces its own copy of these rules.
 */
export function passwordProblems(password: string, { email, siteTitle, siteUrl }: PasswordContext) {
  if (!validator.isLength(password, { min: 10 })) {
    return ['Password must be at least 10 characters long.'];
  }

  const lower = password.toLowerCase();
  const url = (siteUrl ?? window.location.host).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const urlWithSlash = url.endsWith('/') ? url : `${url}/`;
  const problems: string[] = [];

  if (INSECURE_PASSWORDS.includes(password)) {
    problems.push('Sorry, you cannot use an insecure password.');
  }
  if (lower === email.toLowerCase()) {
    problems.push('Sorry, you cannot use the email as your password.');
  }
  if (COMMON_PHRASES.some((phrase) => lower.includes(phrase))) {
    problems.push('Sorry, you cannot use a password including common phrases.');
  }
  if (siteTitle && lower === siteTitle.trim().toLowerCase()) {
    problems.push('Sorry, you cannot use the blog title as your password.');
  }
  if (lower === url || lower === urlWithSlash) {
    problems.push('Sorry, you cannot use the blog URL as your password.');
  }
  if (isRepetitive(password)) {
    problems.push('Sorry, you cannot use an insecure password.');
  }

  return problems;
}
