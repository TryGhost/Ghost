import { describe, expect, it } from 'vitest';
import type { EmailRecipientFailure } from '@tryghost/admin-x-framework/api/emails';
import { groupFailures } from './group-failures';

let id = 0;
const failure = (overrides: Partial<EmailRecipientFailure>): EmailRecipientFailure => ({
  id: `failure-${(id += 1)}`,
  severity: 'permanent',
  code: 550,
  enhanced_code: '5.1.1',
  message: 'Mailbox does not exist',
  ...overrides,
});

describe('groupFailures', () => {
  it('groups by severity and codes, largest first, permanent before temporary on ties', () => {
    const groups = groupFailures([
      failure({ severity: 'temporary', code: 421, enhanced_code: null, message: 'Busy' }),
      failure({}),
      failure({ code: 554, enhanced_code: '5.7.1', message: 'Policy' }),
      failure({}),
    ]);
    expect(groups.map((group) => [group.code, group.enhancedCode, group.failures.length])).toEqual([
      [550, '5.1.1', 2],
      [554, '5.7.1', 1],
      [421, null, 1],
    ]);
  });

  it('keeps the same code at different severities apart', () => {
    const groups = groupFailures([failure({}), failure({ severity: 'temporary' })]);
    expect(groups.map((group) => group.severity)).toEqual(['permanent', 'temporary']);
  });

  it('headlines the most common message in a group', () => {
    const [group] = groupFailures([failure({ message: 'Mailbox full' }), failure({}), failure({})]);
    expect(group.message).toBe('Mailbox does not exist');
  });
});
