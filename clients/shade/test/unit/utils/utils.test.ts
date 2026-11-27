import {
  cn,
  debounce,
  kebabToPascalCase,
  formatNumber,
  abbreviateNumber,
  formatDuration,
  formatPercentage,
} from '@/lib/utils';
import { expect, vi } from 'vitest';

describe('utils', function () {
  describe('cn function', function () {
    it('merges class names correctly', function () {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles conditional classes', function () {
      const result = cn('class1', {
        class2: true,
        class3: false,
      });
      expect(result).toBe('class1 class2');
    });

    it('merges tailwind classes intelligently', function () {
      const result = cn('p-2 bg-red-500', 'p-4');
      expect(result).toBe('bg-red-500 p-4');
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
      expect(counter, 'Function should not be called immediately').toBe(0);

      vi.advanceTimersByTime(150);
      expect(counter, 'Function should be called after the delay').toBe(1);
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

      expect(counter, 'Function should not be called immediately').toBe(0);

      vi.advanceTimersByTime(150);
      expect(counter, 'Function should only be called once').toBe(1);
    });

    it('calls the function immediately if immediate is true', function () {
      let counter = 0;
      const increment = () => {
        counter += 1;
      };

      const debouncedIncrement = debounce(increment, 100, true);

      debouncedIncrement();
      expect(counter, 'Function should be called immediately').toBe(1);
    });
  });

  describe('kebabToPascalCase function', function () {
    it('converts kebab-case to PascalCase', function () {
      const result = kebabToPascalCase('hello-world');
      expect(result).toBe('HelloWorld');
    });

    it('handles multiple hyphens', function () {
      const result = kebabToPascalCase('hello-beautiful-world');
      expect(result).toBe('HelloBeautifulWorld');
    });

    it('handles uppercase letters', function () {
      const result = kebabToPascalCase('hello-World');
      expect(result).toBe('HelloWorld');
    });

    it('handles numbers', function () {
      const result = kebabToPascalCase('hello-world-123');
      expect(result).toBe('HelloWorld123');
    });

    it('handles underscore too', function () {
      const result = kebabToPascalCase('hello_world');
      expect(result).toBe('HelloWorld');
    });
  });

  describe('formatNumber function', function () {
    it('formats a number with thousand separators', function () {
      let formatted = formatNumber(1000);
      expect(formatted).toBe('1,000');

      formatted = formatNumber(1234567);
      expect(formatted).toBe('1,234,567');

      formatted = formatNumber(1234.56);
      expect(formatted).toBe('1,235'); // Should round
    });

    it('preserves decimal precision when fraction-digit options are provided', function () {
      const options = { maximumFractionDigits: 2 };

      expect(formatNumber(5.5, options)).toBe('5.5');
      expect(formatNumber(5.99, options)).toBe('5.99');
      expect(formatNumber(1234.56, options)).toBe('1,234.56');
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
      expect(abbreviateNumber(input)).toBe(expected);
    });
  });

  describe('formatDuration function', function () {
    it('formats duration in seconds properly', function () {
      // Only seconds
      let formatted = formatDuration(45);
      expect(formatted).toBe('45s');

      // Minutes and seconds
      formatted = formatDuration(65);
      expect(formatted).toBe('1m 5s');

      // Hours, minutes, and seconds
      formatted = formatDuration(3665);
      expect(formatted).toBe('1h 1m 5s');
    });

    it('handles edge cases correctly', function () {
      // Zero values in various positions
      let formatted = formatDuration(3600);
      expect(formatted).toBe('1h 0m 0s');

      formatted = formatDuration(60);
      expect(formatted).toBe('1m 0s');
    });
  });

  describe('formatPercentage function', function () {
    it('formats a decimal as a percentage', function () {
      let formatted = formatPercentage(0.123);
      expect(formatted).toBe('12%');

      formatted = formatPercentage(0.789);
      expect(formatted).toBe('79%');

      formatted = formatPercentage(1);
      expect(formatted).toBe('100%');
    });

    it('formats zero percentage', function () {
      const formatted = formatPercentage(0);
      expect(formatted).toBe('0%');
    });

    it('formats very small percentages with 2 decimal places', function () {
      let formatted = formatPercentage(0.0005);
      expect(formatted).toBe('0.05%');

      formatted = formatPercentage(0.0009);
      expect(formatted).toBe('0.09%');
    });

    it('formats small percentages with 1 decimal place', function () {
      let formatted = formatPercentage(0.005);
      expect(formatted).toBe('0.5%');

      formatted = formatPercentage(0.009);
      expect(formatted).toBe('0.9%');
    });

    it('formats large percentages with thousand separators', function () {
      let formatted = formatPercentage(10);
      expect(formatted).toBe('1,000%');

      formatted = formatPercentage(12.34567);
      expect(formatted).toBe('1,235%');

      formatted = formatPercentage(100);
      expect(formatted).toBe('10,000%');
    });
  });
});
