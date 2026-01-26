import * as assert from 'assert/strict';
import {
    cn,
    debounce,
    kebabToPascalCase,
    formatQueryDate,
    formatDisplayDate,
    formatNumber,
    formatDuration,
    formatPercentage,
    getMemberInitials
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

        it('converts ISO date to site timezone when timezone is provided', function () {
            // July 31, 2023 at midnight UTC - in America/New_York (UTC-4 in summer) this is July 30
            const formatted = formatDisplayDate('2023-07-31T00:00:00Z', 'America/New_York');
            assert.equal(formatted, '30 Jul 2023');
        });

        it('converts ISO date to site timezone correctly for positive offset', function () {
            // July 30, 2023 at 11pm UTC - in Europe/Berlin (UTC+2 in summer) this is July 31
            const formatted = formatDisplayDate('2023-07-30T23:00:00Z', 'Europe/Berlin');
            assert.equal(formatted, '31 Jul 2023');
        });

        it('formats date in UTC when no timezone is provided for ISO dates', function () {
            // July 31, 2023 at midnight UTC - should show July 31 without timezone conversion
            const formatted = formatDisplayDate('2023-07-31T00:00:00Z');
            assert.equal(formatted, '31 Jul 2023');
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

    describe('getMemberInitials function', function () {
        it('returns initials from first and last name', function () {
            const initials = getMemberInitials({name: 'John Doe'});
            assert.equal(initials, 'JD');
        });

        it('returns initials from first and last word for names with middle name', function () {
            const initials = getMemberInitials({name: 'John Michael Doe'});
            assert.equal(initials, 'JD');
        });

        it('returns first two characters for single word names', function () {
            const initials = getMemberInitials({name: 'John'});
            assert.equal(initials, 'JO');
        });

        it('handles empty name by using fallback', function () {
            const initials = getMemberInitials({name: ''});
            assert.equal(initials, 'UM'); // "Unknown Member" -> "UM"
        });
    });
}); 