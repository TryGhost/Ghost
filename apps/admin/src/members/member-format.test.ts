import { describe, expect, it } from 'vitest';
import { formatMemberName, getMemberInitials, memberAvatarProps } from '@/members/member-format';

describe('formatMemberName', () => {
  it('returns the trimmed name when present', () => {
    expect(formatMemberName({ name: 'John Doe', email: 'john@example.com' })).toBe('John Doe');
  });

  it('falls back to the email when the name is empty', () => {
    expect(formatMemberName({ name: '', email: 'john@example.com' })).toBe('john@example.com');
  });

  it('falls back to Unknown Member when name and email are missing', () => {
    expect(formatMemberName({})).toBe('Unknown Member');
  });
});

describe('getMemberInitials', () => {
  it('returns initials from first and last name', () => {
    expect(getMemberInitials({ name: 'John Doe' })).toBe('JD');
  });

  it('returns initials from first and last word for names with middle name', () => {
    expect(getMemberInitials({ name: 'John Michael Doe' })).toBe('JD');
  });

  it('returns first two characters for single word names', () => {
    expect(getMemberInitials({ name: 'John' })).toBe('JO');
  });

  it('handles empty name by using fallback', () => {
    expect(getMemberInitials({ name: '' })).toBe('UM'); // "Unknown Member" -> "UM"
  });
});

describe('memberAvatarProps', () => {
  it('derives initials and a name-first color seed', () => {
    expect(memberAvatarProps({ name: 'Jane Doe', email: 'jane@example.com' })).toEqual({
      initials: 'JD',
      colorSeed: 'Jane Doe',
    });
    expect(memberAvatarProps({ email: 'jane@example.com' })).toEqual({
      initials: 'JA',
      colorSeed: 'jane@example.com',
    });
  });

  it('yields undefined props for an absent or empty member', () => {
    expect(memberAvatarProps(undefined)).toEqual({ initials: undefined, colorSeed: undefined });
    expect(memberAvatarProps(null)).toEqual({ initials: undefined, colorSeed: undefined });
    expect(memberAvatarProps({})).toEqual({ initials: undefined, colorSeed: undefined });
  });
});
