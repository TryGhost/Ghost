import { describe, expect, it } from 'vitest';
import { describePresence, presentUsers, unnamedUserIds, userInitials } from './present-users';
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
  it('names users from the staff list in name order, whatever their heartbeat times', () => {
    const earlierZed = presentUsers([entry(users[1].id, 200), entry(users[0].id, 100)], users);
    const earlierAmy = presentUsers([entry(users[0].id, 200), entry(users[1].id, 100)], users);
    expect(earlierZed.map((user) => user.name)).toEqual(['Amy Brown', 'Zed Adams']);
    expect(earlierAmy).toEqual(earlierZed);
    expect(earlierZed[0].image).toBe('https://example.com/amy.png');
  });

  it('collapses one user across resources to one row', () => {
    const result = presentUsers(
      [entry(users[0].id, 300), entry(users[0].id, 100, 'q'.repeat(24))],
      users,
    );
    expect(result).toEqual([{ id: users[0].id, name: 'Zed Adams', image: null }]);
  });

  it('leaves out ids the staff list does not know', () => {
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

describe('unnamedUserIds', () => {
  it('lists each present id the staff list lacks once, in a stable order', () => {
    const late = 'f'.repeat(24);
    const early = 'c'.repeat(24);
    const result = unnamedUserIds(
      [
        entry(late, 300),
        entry(users[0].id, 200),
        entry(early, 100),
        entry(late, 50, 'q'.repeat(24)),
      ],
      users,
    );
    expect(result).toEqual([early, late]);
  });

  it('is empty when everyone is named or the staff list has not loaded', () => {
    expect(unnamedUserIds([entry(users[0].id, 1)], users)).toEqual([]);
    expect(unnamedUserIds([entry('c'.repeat(24), 1)], undefined)).toEqual([]);
  });

  it('drops ids that would not be safe inside a filter', () => {
    expect(unnamedUserIds([entry("x']+status:active", 1), entry('1', 1)], users)).toEqual(['1']);
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

  it('leads with the viewer as You', () => {
    expect(describePresence([], 'post', { withViewer: true })).toBe('You have this post open');
    expect(describePresence(['Sam Kim'], 'page', { withViewer: true })).toBe(
      'You and Sam Kim have this page open',
    );
  });
});
