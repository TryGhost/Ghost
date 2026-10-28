import * as assert from 'assert/strict';
import {
  cn,
  debounce,
  kebabToPascalCase,
  formatNumber,
  abbreviateNumber,
  formatDuration,
  formatPercentage,
} from '@/lib/utils';
import { vi } from 'vitest';

describe('utils', function () {
  describe('cn function', function () {
    it('merges class names correctly', function () {
      const result = cn('class1', 'class2');
      assert.equal(result, 'class1 class2');
    });

    it('handles conditional classes', function () {
      const result = cn('class1', {
        class2: true,
        class3: false,
      });
      assert.equal(result, 'class1 class2');
    });

    it('merges tailwind classes intelligently', function () {
      const result = cn('p-2 bg-red-500', 'p-4');
      assert.equal(result, 'bg-red-500 p-4');
    });
  });

  describe('debounce function', function () {
    beforeEach(function () {
      vi.useFakeTimers();
    });

    afterEach(function () {
      vi.restoreAllMocks();
    });

    it('delays function execution', function () {
      let counter = 0;
      const increment = () => {
        counter += 1;
      };

      const debouncedIncrement = debounce(increment, 100);

      debouncedIncrement();
      assert.equal(counter, 0, 'Function should not be called immediately');

      vi.advanceTimersByTime(150);
      assert.equal(counter, 1, 'Function should be called after the delay');
    });

    it('only calls the function once if called multiple times within the wait period', function () {
      let counter = 0;
      const increment = () => {
        counter += 1;
      };

      const debouncedIncrement = debounce(increment, 100);

      debouncedIncrement();
      debouncedIncrement();
      debouncedIncrement();

      assert.equal(counter, 0, 'Function should not be called immediately');

      vi.advanceTimersByTime(150);
      assert.equal(counter, 1, 'Function should only be called once');
    });

    it('calls the function immediately if immediate is true', function () {
      let counter = 0;
      const increment = () => {
        counter += 1;
      };

      const debouncedIncrement = debounce(increment, 100, true);

      debouncedIncrement();
      assert.equal(counter, 1, 'Function should be called immediately');
    });
  });

  describe('kebabToPascalCase function', function () {
    it('converts kebab-case to PascalCase', function () {
      const result = kebabToPascalCase('hello-world');
      assert.equal(result, 'HelloWorld');
    });

    it('handles multiple hyphens', function () {
      const result = kebabToPascalCase('hello-beautiful-world');
      assert.equal(result, 'HelloBeautifulWorld');
    });

    it('handles uppercase letters', function () {
      const result = kebabToPascalCase('hello-World');
      assert.equal(result, 'HelloWorld');
    });

    it('handles numbers', function () {
      const result = kebabToPascalCase('hello-world-123');
      assert.equal(result, 'HelloWorld123');
    });

    it('handles underscore too', function () {
      const result = kebabToPascalCase('hello_world');
      assert.equal(result, 'HelloWorld');
    });
  });

  describe('formatNumber function', function () {
    it('formats a number with thousand separators', function () {
      let formatted = formatNumber(1000);
      assert.equal(formatted, '1,000');

      formatted = formatNumber(1234567);
      assert.equal(formatted, '1,234,567');

      formatted = formatNumber(1234.56);
      assert.equal(formatted, '1,235'); // Should round
    });

    it('preserves decimal precision when fraction-digit options are provided', function () {
      const options = { maximumFractionDigits: 2 };

      assert.equal(formatNumber(5.5, options), '5.5');
      assert.equal(formatNumber(5.99, options), '5.99');
      assert.equal(formatNumber(1234.56, options), '1,234.56');
    });
  });

  describe('abbreviateNumber function', function () {
    it.each([
      [0, '0'],
      [12.6, '13'],
      [123, '123'],
      [999, '999'],
      [-1, '-1'],
      [-1000, '-1k'],
      [1000, '1k'],
      [1004, '1k'],
      [1099, '1.1k'],
      [1500, '1.5k'],
      [99999, '100k'],
      [999500, '1M'],
      [1_000_000, '1M'],
      [-1_000_000, '-1M'],
      [1_234_567, '1.2M'],
      [2_500_000, '2.5M'],
      [123_456_789, '123.5M'],
      [999_999_999, '1000M'],
      [123_456_789_000, '123456.8M'],
      [150_000_000_000, '150000M'],
      [Infinity, '0'],
      [-Infinity, '0'],
      [NaN, '0'],
    ])('formats %s as %s', (input, expected) => {
      assert.equal(abbreviateNumber(input), expected);
    });
  });

  describe('formatDuration function', function () {
    it('formats duration in seconds properly', function () {
      // Only seconds
      let formatted = formatDuration(45);
      assert.equal(formatted, '45s');

      // Minutes and seconds
      formatted = formatDuration(65);
      assert.equal(formatted, '1m 5s');

      // Hours, minutes, and seconds
      formatted = formatDuration(3665);
      assert.equal(formatted, '1h 1m 5s');
    });

    it('handles edge cases correctly', function () {
      // Zero values in various positions
      let formatted = formatDuration(3600);
      assert.equal(formatted, '1h 0m 0s');

      formatted = formatDuration(60);
      assert.equal(formatted, '1m 0s');
    });
  });

  describe('formatPercentage function', function () {
    it('formats a decimal as a percentage', function () {
      let formatted = formatPercentage(0.123);
      assert.equal(formatted, '12%');

      formatted = formatPercentage(0.789);
      assert.equal(formatted, '79%');

      formatted = formatPercentage(1);
      assert.equal(formatted, '100%');
    });

    it('formats zero percentage', function () {
      const formatted = formatPercentage(0);
      assert.equal(formatted, '0%');
    });

    it('formats very small percentages with 2 decimal places', function () {
      let formatted = formatPercentage(0.0005);
      assert.equal(formatted, '0.05%');

      formatted = formatPercentage(0.0009);
      assert.equal(formatted, '0.09%');
    });

    it('formats small percentages with 1 decimal place', function () {
      let formatted = formatPercentage(0.005);
      assert.equal(formatted, '0.5%');

      formatted = formatPercentage(0.009);
      assert.equal(formatted, '0.9%');
    });

    it('formats large percentages with thousand separators', function () {
      let formatted = formatPercentage(10);
      assert.equal(formatted, '1,000%');

      formatted = formatPercentage(12.34567);
      assert.equal(formatted, '1,235%');

      formatted = formatPercentage(100);
      assert.equal(formatted, '10,000%');
    });
  });
});
