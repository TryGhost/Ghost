import { describe, expect, it } from 'vitest';
import { typedTime } from './typed-time';

describe('typedTime', () => {
  it.each([
    ['20:00', 20, 0],
    ['08:15', 8, 15],
    ['8:15', 8, 15],
    ['0815', 8, 15],
    ['2000', 20, 0],
    ['20', 20, 0],
    ['8', 8, 0],
    ['0', 0, 0],
    ['23:59', 23, 59],
    [' 20:00 ', 20, 0],
  ])('reads %j as %i:%i', (input, hour, minute) => {
    expect(typedTime(input)).toEqual({ hour, minute });
  });

  it.each([
    '',
    '200',
    '930',
    '24',
    '2400',
    '24:00',
    '12:60',
    '1260',
    '12:5',
    '20:',
    '20.00',
    '20h',
    '8:15 PM',
  ])('refuses %j', (input) => {
    expect(typedTime(input)).toBeNull();
  });
});
