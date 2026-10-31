import { describe, expect, it } from 'vitest';
import { describePresence, presentUsers, userInitials } from './present-users';
import type { ActivePresence } from './presence-api';

const POST = 'p'.repeat(24);
const entry = (userId: string, ts: number, resourceId = POST): ActivePresence => ({
  userId,
  resourceId,
  resourceType: 'post',
  ts,
});
const users = [
  { id: 'a'.repeat(24), name: 'Zed Adams', profile_image: null },
  { id: 'b'.repeat(24), name: 'Amy Brown', profile_image: 'https://example.com/amy.png' },
];

describe('presentUsers', () => {
  it('names users from the staff list, earliest arrival first', () => {
    const result = presentUsers([entry(users[1].id, 200), entry(users[0].id, 100)], users);
    expect(result.map((user) => user.name)).toEqual(['Zed Adams', 'Amy Brown']);
    expect(result[1].image).toBe('https://example.com/amy.png');
  });

  it('collapses one user across resources to their earliest heartbeat', () => {
    const result = presentUsers(
      [entry(users[0].id, 300), entry(users[0].id, 100, 'q'.repeat(24))],
      users,
    );
    expect(result).toEqual([{ id: users[0].id, name: 'Zed Adams', image: null, since: 100 }]);
  });

  it('breaks ties by name and leaves out ids the staff list does not know', () => {
    const result = presentUsers(
      [entry(users[0].id, 100), entry(users[1].id, 100), entry('x'.repeat(24), 50)],
      users,
    );
    expect(result.map((user) => user.name)).toEqual(['Amy Brown', 'Zed Adams']);
  });

  it('is empty without a staff list or without entries', () => {
    expect(presentUsers([entry(users[0].id, 1)], undefined)).toEqual([]);
    expect(presentUsers([], users)).toEqual([]);
  });
});

describe('userInitials', () => {
  it('takes the first letters of the first two words', () => {
    expect(userInitials('  amy  brown-smith ')).toBe('AB');
    expect(userInitials('Cher')).toBe('C');
  });
});

describe('describePresence', () => {
  it('names everyone in one sentence with the right verb', () => {
    expect(describePresence(['Alex Smith'], 'post')).toBe('Alex Smith has this post open');
    expect(describePresence(['Alex Smith', 'Sam Kim'], 'page')).toBe(
      'Alex Smith and Sam Kim have this page open',
    );
    expect(describePresence(['Alex', 'Sam', 'Kim'], 'post')).toBe(
      'Alex, Sam and Kim have this post open',
    );
  });
});
