import {render, fireEvent} from '../../utils/test-utils';
import MagicLinkPage from './MagicLinkPage';

const setup = (overrideContext = {}) => {
    const {mockOnActionFn, ...utils} = render(
        <MagicLinkPage />,
        {
            overrideContext: {
                labs: {membersSigninOTC: false},
                otcRef: null,
                ...overrideContext
            }
        }
    );
    const inboxText = utils.getByText(/Now check your email!/i);
    const closeBtn = utils.queryByRole('button', {name: 'Close'});
    return {
        inboxText,
        closeBtn,
        mockOnActionFn,
        ...utils
    };
};

describe('MagicLinkPage', () => {
    test('renders', () => {
        const {inboxText, closeBtn} = setup();

        expect(inboxText).toBeInTheDocument();
        expect(closeBtn).toBeInTheDocument();
    });

    test('calls on action with close popup', () => {
        const {closeBtn, mockOnActionFn} = setup();

        fireEvent.click(closeBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('closePopup');
    });

    describe('OTC form conditional rendering', () => {
        test('renders OTC form when lab flag is enabled and otcRef exists', () => {
            const utils = render(
                <MagicLinkPage />,
                {
                    overrideContext: {
                        labs: {membersSigninOTC: true},
                        otcRef: 'test-otc-ref'
                    }
                }
            );

            const otcSection = utils.getByText('You can also use the one-time code to sign in here.');
            const otcInput = utils.getByLabelText('Enter one-time code');
            const verifyButton = utils.getByRole('button', {name: 'Verify Code'});

            expect(otcSection).toBeInTheDocument();
            expect(otcInput).toBeInTheDocument();
            expect(verifyButton).toBeInTheDocument();
        });

        test('does not render OTC form when lab flag is disabled', () => {
            const utils = render(
                <MagicLinkPage />,
                {
                    overrideContext: {
                        labs: {membersSigninOTC: false},
                        otcRef: 'test-otc-ref'
                    }
                }
            );

            const otcSection = utils.queryByText('You can also use the one-time code to sign in here.');
            const otcInput = utils.queryByLabelText('Enter one-time code');
            const verifyButton = utils.queryByRole('button', {name: 'Verify Code'});

            expect(otcSection).not.toBeInTheDocument();
            expect(otcInput).not.toBeInTheDocument();
            expect(verifyButton).not.toBeInTheDocument();
        });

        test('does not render OTC form when otcRef is missing', () => {
            const utils = render(
                <MagicLinkPage />,
                {
                    overrideContext: {
                        labs: {membersSigninOTC: true},
                        otcRef: null
                    }
                }
            );

            const otcSection = utils.queryByText('You can also use the one-time code to sign in here.');
            const otcInput = utils.queryByLabelText('Enter one-time code');
            const verifyButton = utils.queryByRole('button', {name: 'Verify Code'});

            expect(otcSection).not.toBeInTheDocument();
            expect(otcInput).not.toBeInTheDocument();
            expect(verifyButton).not.toBeInTheDocument();
        });

        test('does not render OTC form when both lab flag is disabled and otcRef is missing', () => {
            const utils = render(
                <MagicLinkPage />,
                {
                    overrideContext: {
                        labs: {membersSigninOTC: false},
                        otcRef: null
                    }
                }
            );

            const otcSection = utils.queryByText('You can also use the one-time code to sign in here.');
            const otcInput = utils.queryByLabelText('Enter one-time code');
            const verifyButton = utils.queryByRole('button', {name: 'Verify Code'});

            expect(otcSection).not.toBeInTheDocument();
            expect(otcInput).not.toBeInTheDocument();
            expect(verifyButton).not.toBeInTheDocument();
        });
    });

    describe('OTC input field properties and behavior', () => {
        const setupWithOTC = () => {
            return render(
                <MagicLinkPage />,
                {
                    overrideContext: {
                        labs: {membersSigninOTC: true},
                        otcRef: 'test-otc-ref'
                    }
                }
            );
        };

        test('input field has correct basic attributes', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            expect(otcInput).toHaveAttribute('type', 'text');
            expect(otcInput).toHaveAttribute('placeholder', '• • • • • •');
            expect(otcInput).toHaveClass('gh-portal-input');
            expect(otcInput).toHaveAttribute('name', 'otc');
            expect(otcInput).toHaveAttribute('id', 'input-otc');
        });

        test('input field is initially empty', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            expect(otcInput).toHaveValue('');
        });

        test('input accepts numeric values and updates', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            fireEvent.change(otcInput, {target: {value: '123456'}});
            expect(otcInput).toHaveValue('123456');
        });

        test('input accepts partial numeric values', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            fireEvent.change(otcInput, {target: {value: '123'}});
            expect(otcInput).toHaveValue('123');
        });

        test('input field updates progressively', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            // Test progressive input
            fireEvent.change(otcInput, {target: {value: '1'}});
            expect(otcInput).toHaveValue('1');
            
            fireEvent.change(otcInput, {target: {value: '123'}});
            expect(otcInput).toHaveValue('123');
            
            fireEvent.change(otcInput, {target: {value: '123456'}});
            expect(otcInput).toHaveValue('123456');
        });

        test('input can be cleared and reset', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            // Enter a value first
            fireEvent.change(otcInput, {target: {value: '123456'}});
            expect(otcInput).toHaveValue('123456');
            
            // Clear the value
            fireEvent.change(otcInput, {target: {value: ''}});
            expect(otcInput).toHaveValue('');
        });

        test('input field has proper label association', () => {
            const {getByLabelText, getByText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const labelText = getByText('Enter one-time code');
            
            expect(otcInput).toBeInTheDocument();
            expect(labelText).toBeInTheDocument();
        });

        test('input handles various numeric patterns', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            // Test different valid OTC patterns
            const testCodes = ['000000', '123456', '999999', '000123'];
            
            testCodes.forEach((code) => {
                fireEvent.change(otcInput, {target: {value: code}});
                expect(otcInput).toHaveValue(code);
            });
        });

        test('input field configuration is accessible', () => {
            const {getByLabelText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            // Test accessibility and basic field setup
            expect(otcInput.id).toBe('input-otc');
            expect(otcInput.name).toBe('otc');
            expect(otcInput.type).toBe('text');
            expect(otcInput.placeholder).toBe('• • • • • •');
            expect(otcInput).toHaveAttribute('aria-label', 'Enter one-time code');
        });
    });

    describe('OTC form validation and error handling', () => {
        const setupWithOTC = () => {
            return render(
                <MagicLinkPage />,
                {
                    overrideContext: {
                        labs: {membersSigninOTC: true},
                        otcRef: 'test-otc-ref'
                    }
                }
            );
        };

        test('shows validation error when submitting empty form', () => {
            const {getByLabelText, getByRole, queryByText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            expect(otcInput).toHaveValue('');
            
            fireEvent.click(submitButton);
            
            const errorMessage = queryByText(/please enter otc/i);
            expect(errorMessage).toBeInTheDocument();
        });

        test('shows validation error when submitting form via Enter key', () => {
            const {getByLabelText, queryByText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            
            expect(otcInput).toHaveValue('');
            
            fireEvent.keyDown(otcInput, {key: 'Enter', keyCode: 13});
            
            const errorMessage = queryByText(/please enter otc/i);
            expect(errorMessage).toBeInTheDocument();
        });

        test('clears validation error when valid input is provided', () => {
            const {getByLabelText, getByRole, queryByText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // Submit empty form to trigger error
            fireEvent.click(submitButton);
            
            // Verify error appears
            let errorMessage = queryByText(/please enter otc/i);
            expect(errorMessage).toBeInTheDocument();
            
            // Enter valid OTC
            fireEvent.change(otcInput, {target: {value: '123456'}});
            
            // Submit again
            fireEvent.click(submitButton);
            
            // Error should be cleared
            errorMessage = queryByText(/please enter otc/i);
            expect(errorMessage).not.toBeInTheDocument();
        });

        test('input field shows error styling when validation fails', () => {
            const {getByLabelText, getByRole} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // Initially no error styling
            expect(otcInput).not.toHaveClass('error');
            
            // Submit empty form
            fireEvent.click(submitButton);
            
            // Input should have error styling
            expect(otcInput).toHaveClass('error');
        });

        test('input field clears error styling when valid input provided', () => {
            const {getByLabelText, getByRole} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // Trigger error state
            fireEvent.click(submitButton);
            expect(otcInput).toHaveClass('error');
            
            // Enter valid input
            fireEvent.change(otcInput, {target: {value: '123456'}});
            
            // Submit again
            fireEvent.click(submitButton);
            
            // Error styling should be cleared
            expect(otcInput).not.toHaveClass('error');
        });

        // @TODO: this needs to be updated when console log is removed
        test('validation does not proceed to submission when errors exist', () => {
            const {getByRole} = setupWithOTC();
            
            // Mock console.log to verify submission doesn't happen
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // Submit empty form
            fireEvent.click(submitButton);
            
            // Verify console.log was not called (submission didn't happen)
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        // @TODO: this needs to be updated when console log is removed
        test('validation allows submission when no errors exist', () => {
            const {getByLabelText, getByRole} = setupWithOTC();
            
            // Mock console.log to verify submission happens
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // Enter valid OTC
            fireEvent.change(otcInput, {target: {value: '123456'}});
            
            // Submit form
            fireEvent.click(submitButton);
            
            // Verify console.log was called (submission happened)
            expect(consoleSpy).toHaveBeenCalledWith('token: test-otc-ref otc: 123456');
            
            consoleSpy.mockRestore();
        });

        test('multiple validation attempts update error state correctly', () => {
            const {getByLabelText, getByRole, queryByText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // First attempt: empty form
            fireEvent.click(submitButton);
            expect(queryByText(/please enter otc/i)).toBeInTheDocument();
            
            // Second attempt: enter partial code then clear
            fireEvent.change(otcInput, {target: {value: '123'}});
            fireEvent.change(otcInput, {target: {value: ''}});
            fireEvent.click(submitButton);
            expect(queryByText(/please enter otc/i)).toBeInTheDocument();
            
            // Third attempt: valid code
            fireEvent.change(otcInput, {target: {value: '123456'}});
            fireEvent.click(submitButton);
            expect(queryByText(/please enter otc/i)).not.toBeInTheDocument();
        });

        test('validation state persists across input changes until submission', () => {
            const {getByLabelText, getByRole, queryByText} = setupWithOTC();
            
            const otcInput = getByLabelText('Enter one-time code');
            const submitButton = getByRole('button', {name: 'Verify Code'});
            
            // Trigger validation error
            fireEvent.click(submitButton);
            expect(queryByText(/please enter otc/i)).toBeInTheDocument();
            
            // Type in input (should not clear error until submission)
            fireEvent.change(otcInput, {target: {value: '1'}});
            expect(queryByText(/please enter otc/i)).toBeInTheDocument();
            
            fireEvent.change(otcInput, {target: {value: '12'}});
            expect(queryByText(/please enter otc/i)).toBeInTheDocument();
            
            // Only clears when form is submitted again
            fireEvent.change(otcInput, {target: {value: '123456'}});
            fireEvent.click(submitButton);
            expect(queryByText(/please enter otc/i)).not.toBeInTheDocument();
        });
    });
});
