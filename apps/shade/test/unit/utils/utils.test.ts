import * as assert from 'assert/strict';
import {
    cn,
    debounce,
    kebabToPascalCase, 
    formatQueryDate, 
    formatDisplayDate, 
    formatNumber,
    formatDuration,
    formatPercentage
} from '@/lib/utils';
import moment from 'moment-timezone';
import {vi} from 'vitest';

describe('utils', function () {
    describe('cn function', function () {
        it('merges class names correctly', function () {
            const result = cn('class1', 'class2');
            assert.equal(result, 'class1 class2');
        });

        it('handles conditional classes', function () {
            const result = cn('class1', {
                class2: true,
                class3: false
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

    describe('formatQueryDate function', function () {
        it('formats a moment date for queries', function () {
            const date = moment('2023-04-15');
            const formattedDate = formatQueryDate(date);
            assert.equal(formattedDate, '2023-04-15');
        });
    });

    describe('formatDisplayDate function', function () {
        it('returns an empty string if the date string is an empty string', function () {
            const formatted = formatDisplayDate('');
            assert.equal(formatted, '');
        });

        it('returns an empty string if the date string is an invalid type', function () {
            // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
            const formatted = formatDisplayDate(123);
            assert.equal(formatted, '');
        });

        it('does not throw an error if the date string is a Date object', function () {
            const date = new Date('2023-04-15');
            // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
            const formatted = formatDisplayDate(date);
            assert.equal(formatted, '15 Apr 2023');
        });

        it('handles a date string with time but without a timezone', function () {
            const formatted = formatDisplayDate('2023-04-15 12:00:00');
            assert.equal(formatted, '15 Apr 2023');
        });

        it('handles an ISO8601 date string', function () {
            const formatted = formatDisplayDate('2023-04-15T12:00:00Z');
            assert.equal(formatted, '15 Apr 2023');
        });

        it('formats a date string to display format', function () {
            // Using a predefined date for testing, bypassing the current date check
            // Test different year formatting without mocking Date
            const differentYearFormatted = formatDisplayDate('2020-12-31');
            assert.equal(differentYearFormatted, '31 Dec 2020');
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
    });
}); 