import { describe, expect, it } from 'vitest';

import { APP_ID_MAX_LENGTH, isValidAppId } from '../src/index.ts';

describe('isValidAppId', () => {
  it('accepts lowercase reverse-domain IDs', () => {
    expect(isValidAppId('com.example.podcast')).toBe(true);
    expect(isValidAppId('io.ghost.test-app')).toBe(true);
    expect(isValidAppId('dev.jonatan.cards2')).toBe(true);
    expect(isValidAppId('com.xn--bcher-kva.reader')).toBe(true);
  });

  it('rejects IDs that are not reverse-domain style', () => {
    expect(isValidAppId('podcast')).toBe(false);
    expect(isValidAppId('com..podcast')).toBe(false);
    expect(isValidAppId('.com.podcast')).toBe(false);
    expect(isValidAppId('com.podcast.')).toBe(false);
    expect(isValidAppId('com.example.pod_cast')).toBe(false);
    expect(isValidAppId('com.example.-podcast')).toBe(false);
    expect(isValidAppId('com.example.podcast-')).toBe(false);
    expect(isValidAppId('com.example.pod cast')).toBe(false);
    expect(isValidAppId('')).toBe(false);
  });

  it('rejects IDs that start with a digit, such as addresses and versions', () => {
    expect(isValidAppId('127.0.0.1')).toBe(false);
    expect(isValidAppId('1.2')).toBe(false);
    expect(isValidAppId('com.example.123')).toBe(true);
  });

  it('rejects uppercase rather than lowercasing it', () => {
    expect(isValidAppId('Com.Example.Podcast')).toBe(false);
  });

  it('rejects IDs longer than the index allows', () => {
    const longest = `com.${'a'.repeat(APP_ID_MAX_LENGTH - 4)}`;
    expect(longest).toHaveLength(APP_ID_MAX_LENGTH);
    expect(isValidAppId(longest)).toBe(true);
    expect(isValidAppId(`${longest}a`)).toBe(false);
  });

  it('rejects values that are not strings', () => {
    expect(isValidAppId(undefined)).toBe(false);
    expect(isValidAppId(42)).toBe(false);
    expect(isValidAppId(['com.example.podcast'])).toBe(false);
  });
});
