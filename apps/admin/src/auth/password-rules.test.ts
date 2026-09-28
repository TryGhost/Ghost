import { describe, expect, it } from 'vitest';
import { passwordProblems } from './password-rules';

const context = {
  email: 'jamie@example.com',
  siteTitle: 'The Daily Awesome',
  siteUrl: 'https://daily.example.com',
};

describe('passwordProblems', () => {
  it('accepts a long, unrelated password', () => {
    expect(passwordProblems('correct horse battery', context)).toEqual([]);
  });

  it('stops at the length rule', () => {
    expect(passwordProblems('ghost', context)).toEqual([
      'Password must be at least 10 characters long.',
    ]);
  });

  it.each([
    ['1234567890', 'Sorry, you cannot use an insecure password.'],
    ['JAMIE@example.com', 'Sorry, you cannot use the email as your password.'],
    ['myghostpassword1', 'Sorry, you cannot use a password including common phrases.'],
    ['the daily awesome', 'Sorry, you cannot use the blog title as your password.'],
    ['daily.example.com', 'Sorry, you cannot use the blog URL as your password.'],
    ['daily.example.com/', 'Sorry, you cannot use the blog URL as your password.'],
    ['aaaaaaaaaabc', 'Sorry, you cannot use an insecure password.'],
  ])('rejects %s', (password, problem) => {
    expect(passwordProblems(password, context)).toContain(problem);
  });

  it('lists every broken rule in check order', () => {
    expect(passwordProblems('passwordpassword', context)).toEqual([
      'Sorry, you cannot use a password including common phrases.',
    ]);
    expect(passwordProblems('aaaaaaaaaa', context)).toEqual([
      'Sorry, you cannot use an insecure password.',
    ]);
  });
});
