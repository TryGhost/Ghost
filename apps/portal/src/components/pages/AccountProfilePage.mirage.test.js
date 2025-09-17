/**
 * Example migration: AccountProfilePage test using new Mirage patterns
 *
 * This file demonstrates how to migrate from the old manual setup pattern
 * to the new Mirage-based approach. Compare with AccountProfilePage.test.js
 */

import { describe, test, expect } from 'vitest';
import { render, fireEvent } from '../../utils/test-utils';
import { server } from '../../mirage/test-setup';
import AccountProfilePage from './AccountProfilePage';

// NEW PATTERN: Using Mirage for data setup
const setupWithMirage = ({ memberTraits = ['free'], memberOverrides = {} } = {}) => {
    // Create member data using Mirage
    const member = server.create('member', ...memberTraits, memberOverrides);

    // Render with the member data in context
    const { mockOnActionFn, context, ...utils } = render(
        <AccountProfilePage />,
        {
            overrideContext: {
                member: member.attrs // Use Mirage-generated member data
            }
        }
    );

    const emailInputEl = utils.getByLabelText(/email/i);
    const nameInputEl = utils.getByLabelText(/name/i);
    const saveBtn = utils.queryByRole('button', { name: 'Save' });

    return {
        emailInputEl,
        nameInputEl,
        saveBtn,
        mockOnActionFn,
        context,
        member, // Return the Mirage member for additional assertions
        ...utils
    };
};

// OLD PATTERN: Manual setup (for comparison)
const setupOriginal = () => {
    const { mockOnActionFn, context, ...utils } = render(
        <AccountProfilePage />
    );
    const emailInputEl = utils.getByLabelText(/email/i);
    const nameInputEl = utils.getByLabelText(/name/i);
    const saveBtn = utils.queryByRole('button', { name: 'Save' });
    return {
        emailInputEl,
        nameInputEl,
        saveBtn,
        mockOnActionFn,
        context,
        ...utils
    };
};

describe('Account Profile Page - Mirage Migration Example', () => {
    describe('NEW PATTERN: Using Mirage', () => {
        test('renders with free member data', () => {
            const { emailInputEl, nameInputEl, saveBtn, member } = setupWithMirage({
                memberTraits: ['free']
            });

            expect(emailInputEl).toBeInTheDocument();
            expect(nameInputEl).toBeInTheDocument();
            expect(saveBtn).toBeInTheDocument();

            // We can also verify the member data is realistic
            expect(member.name).toBe('Jamie Larson');
            expect(member.email).toBe('jamie@example.com');
            expect(member.paid).toBe(false);
        });

        test('renders with paid member data', () => {
            const { emailInputEl, nameInputEl, saveBtn, member } = setupWithMirage({
                memberTraits: ['paid']
            });

            expect(emailInputEl).toBeInTheDocument();
            expect(nameInputEl).toBeInTheDocument();
            expect(saveBtn).toBeInTheDocument();

            // Paid member should have different characteristics
            expect(member.paid).toBe(true);
            expect(member.subscriptions.models).toHaveLength(1);
        });

        test('renders with custom member data', () => {
            const { emailInputEl, nameInputEl, saveBtn, member } = setupWithMirage({
                memberTraits: ['free'],
                memberOverrides: {
                    name: 'Custom User',
                    email: 'custom@example.com'
                }
            });

            expect(emailInputEl).toBeInTheDocument();
            expect(nameInputEl).toBeInTheDocument();
            expect(saveBtn).toBeInTheDocument();

            expect(member.name).toBe('Custom User');
            expect(member.email).toBe('custom@example.com');
        });

        test('can call save with member data', () => {
            const { mockOnActionFn, saveBtn, context } = setupWithMirage({
                memberTraits: ['paid'],
                memberOverrides: {
                    name: 'Test Member',
                    email: 'test@example.com'
                }
            });

            fireEvent.click(saveBtn);

            expect(mockOnActionFn).toHaveBeenCalledWith('updateProfile', {
                email: 'test@example.com',
                name: 'Test Member'
            });
        });

        test('handles suppressed member', () => {
            const { member } = setupWithMirage({
                memberTraits: ['suppressed']
            });

            expect(member.email_suppression.suppressed).toBe(true);
            expect(member.email_suppression.info.reason).toBe('spam');
        });
    });

    describe('COMPARISON: Old vs New Benefits', () => {
        test('OLD: Fixed test data (current approach)', () => {
            const { context } = setupOriginal();

            // Old way: Test data comes from fixed fixtures
            // - Always the same member data
            // - Hard to test different scenarios
            // - Manual setup required for variations
            expect(context.member.name).toBe('Jamie Larson'); // Always the same
        });

        test('NEW: Dynamic, realistic data - free member', () => {
            const { member } = setupWithMirage({ memberTraits: ['free'] });
            expect(member.paid).toBe(false);
        });

        test('NEW: Dynamic, realistic data - paid member', () => {
            const { member } = setupWithMirage({ memberTraits: ['paid'] });
            expect(member.paid).toBe(true);
        });

        test('NEW: Dynamic, realistic data - complimentary member', () => {
            const { member } = setupWithMirage({ memberTraits: ['complimentary'] });
            expect(member.paid).toBe(true);
        });
    });
});

describe('Benefits of Mirage Migration', () => {
    test('Easy to test different member types', () => {
        // Before: Would need separate setup functions or complex fixture manipulation
        // After: Just change the traits

        const freeMember = server.create('member', 'free');
        const paidMember = server.create('member', 'paid');
        const suppressedMember = server.create('member', 'suppressed');

        expect(freeMember.paid).toBe(false);
        expect(paidMember.paid).toBe(true);
        expect(suppressedMember.email_suppression.suppressed).toBe(true);
    });

    test('Realistic data relationships', () => {
        const member = server.create('member', 'paid');

        // Member automatically has realistic subscription data
        expect(member.subscriptions.models).toHaveLength(1);
        expect(member.subscriptions.models[0].status).toBe('active');
        expect(member.subscriptions.models[0].currency).toBe('USD');
    });

    test('Easy to create edge cases', () => {
        const member = server.create('member', 'free', {
            name: '',
            email: 'edge-case@example.com'
        });

        expect(member.name).toBe('');
        expect(member.email).toBe('edge-case@example.com');
        expect(member.paid).toBe(false);
    });
});