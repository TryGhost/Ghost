import {render, fireEvent} from '../../utils/test-utils';
import MagicLinkPage from './MagicLinkPage';

const OTC_LABEL_REGEX = /Code/i;
const OTC_ERROR_REGEX = /Enter code/i;

const setupTest = (options = {}) => {
    const {
        labs = {},
        otcRef = null,
        action = 'init:success',
        ...contextOverrides
    } = options;

    const {mockDoActionFn, ...utils} = render(
        <MagicLinkPage />,
        {
            overrideContext: {
                labs,
                otcRef,
                action,
                ...contextOverrides
            }
        }
    );

    return {
        mockDoActionFn,
        ...utils
    };
};

// Helper for OTC-enabled tests
const setupOTCTest = (options = {}) => {
    return setupTest({
        labs: {},
        otcRef: 'test-otc-ref',
        ...options
    });
};

const fillAndSubmitOTC = (utils, code = '123456', method = 'button') => {
    const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);
    fireEvent.change(otcInput, {target: {value: code}});

    if (method === 'button') {
        const submitButton = utils.getByRole('button', {name: 'Continue'});
        fireEvent.click(submitButton);
    } else {
        const form = otcInput.closest('form');
        fireEvent.submit(form);
    }

    return otcInput;
};

describe('MagicLinkPage', () => {
    describe('Basic functionality', () => {
        test('renders magic link page with email notification', () => {
            const utils = setupTest();

            const inboxText = utils.getByText(/Now check your email!/i);
            const closeBtn = utils.getByRole('button', {name: 'Close'});

            expect(inboxText).toBeInTheDocument();
            expect(closeBtn).toBeInTheDocument();
        });

        test('calls close popup action when close button clicked', () => {
            const {getByRole, mockDoActionFn} = setupTest();
            const closeBtn = getByRole('button', {name: 'Close'});

            fireEvent.click(closeBtn);

            expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
        });
    });

    describe('OTC form conditional rendering', () => {
        test('renders OTC form when otcRef exists', () => {
            const utils = setupOTCTest();

            expect(utils.getByLabelText(OTC_LABEL_REGEX)).toBeInTheDocument();
            expect(utils.getByRole('button', {name: 'Continue'})).toBeInTheDocument();
        });

        test('does not render OTC form when conditions not met', () => {
            const scenarios = [
                {labs: {}, otcRef: null}
            ];

            scenarios.forEach(({labs, otcRef}) => {
                const utils = setupTest({labs, otcRef});

                expect(utils.queryByLabelText(OTC_LABEL_REGEX)).not.toBeInTheDocument();
                expect(utils.queryByRole('button', {name: 'Continue'})).not.toBeInTheDocument();
            });
        });
    });

    describe('OTC input behavior', () => {
        test('has correct accessibility and field configuration', () => {
            const utils = setupOTCTest();
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);

            expect(otcInput).toHaveAttribute('type', 'text');
            expect(otcInput).toHaveAttribute('name', 'otc');
            expect(otcInput).toHaveAttribute('id', 'input-otc');
            expect(otcInput).toHaveAccessibleName(OTC_LABEL_REGEX);
        });

        test('accepts and updates with numeric input progressively', () => {
            const utils = setupOTCTest();
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);

            expect(otcInput).toHaveValue('');

            fireEvent.change(otcInput, {target: {value: '1'}});
            expect(otcInput).toHaveValue('1');

            fireEvent.change(otcInput, {target: {value: '123456'}});
            expect(otcInput).toHaveValue('123456');

            fireEvent.change(otcInput, {target: {value: ''}});
            expect(otcInput).toHaveValue('');
        });

        test('handles various valid numeric patterns', () => {
            const utils = setupOTCTest();
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);
            const testCodes = ['000000', '123456', '999999', '000123'];

            testCodes.forEach((code) => {
                fireEvent.change(otcInput, {target: {value: code}});
                expect(otcInput).toHaveValue(code);
            });
        });
    });

    describe('OTC form validation', () => {
        test('shows validation error for empty form submission', () => {
            const utils = setupOTCTest();
            const submitButton = utils.getByRole('button', {name: 'Continue'});
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);

            fireEvent.click(submitButton);

            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();
            expect(otcInput).toHaveClass('error');
        });

        test('shows validation error for Enter key submission', () => {
            const utils = setupOTCTest();
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);

            const form = otcInput.closest('form');
            fireEvent.submit(form);

            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();
        });

        test('clears validation error when valid input provided', () => {
            const utils = setupOTCTest();
            const submitButton = utils.getByRole('button', {name: 'Continue'});
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);

            // triggers error because there's no input
            fireEvent.click(submitButton);
            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();

            fireEvent.change(otcInput, {target: {value: '123456'}});
            fireEvent.click(submitButton);

            expect(utils.queryByText(OTC_ERROR_REGEX)).not.toBeInTheDocument();
            expect(otcInput).not.toHaveClass('error');
        });

        test('validation blocks submission and allows valid submission', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest();
            const submitButton = testUtils.getByRole('button', {name: 'Continue'});
            const otcInput = testUtils.getByLabelText(OTC_LABEL_REGEX);

            // empty submission should be blocked
            fireEvent.click(submitButton);

            expect(mockDoActionFn).not.toHaveBeenCalledWith('verifyOTC', expect.anything());

            // valid submission should proceed
            fireEvent.change(otcInput, {target: {value: '123456'}});
            fireEvent.click(submitButton);

            expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                otc: '123456',
                otcRef: 'test-otc-ref'
            });
        });

        test('validation state persists across input changes until submission', () => {
            const utils = setupOTCTest();
            const submitButton = utils.getByRole('button', {name: 'Continue'});
            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);

            // triggers error because there's no input
            fireEvent.click(submitButton);
            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();

            // still an error, input too short
            fireEvent.change(otcInput, {target: {value: '1'}});
            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();

            // input valid, error should clear
            fireEvent.change(otcInput, {target: {value: '123456'}});
            fireEvent.click(submitButton);

            expect(utils.queryByText(OTC_ERROR_REGEX)).not.toBeInTheDocument();
        });
    });

    describe('OTC form submission', () => {
        test('submits via button click', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest();

            fillAndSubmitOTC(testUtils, '123456', 'button');

            expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                otc: '123456',
                otcRef: 'test-otc-ref'
            });
        });

        test('submits via Enter key', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest();

            fillAndSubmitOTC(testUtils, '654321', 'enter');

            expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                otc: '654321',
                otcRef: 'test-otc-ref'
            });
        });

        test('handles different valid OTC formats', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest();
            const testCodes = ['000000', '123456', '999999'];

            testCodes.forEach((code) => {
                mockDoActionFn.mockClear();
                fillAndSubmitOTC(testUtils, code);

                expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                    otc: code,
                    otcRef: 'test-otc-ref'
                });
            });
        });
    });

    describe('OTC button states', () => {
        test('shows normal state by default', () => {
            const utils = setupOTCTest();
            const submitButton = utils.getByRole('button', {name: 'Continue'});

            expect(submitButton).toBeInTheDocument();
            expect(submitButton).not.toBeDisabled();
            expect(submitButton).toHaveTextContent('Continue');
        });

        test('shows loading state and disables interaction', () => {
            const utils = setupOTCTest({action: 'verifyOTC:running'});
            const loadingButton = utils.getByRole('button');

            expect(loadingButton).toBeDisabled();
            expect(loadingButton.querySelector('.gh-portal-loadingicon')).toBeInTheDocument();
        });

        test('shows error state and allows retry', () => {
            const utils = setupOTCTest({action: 'verifyOTC:failed'});
            const submitButton = utils.getByRole('button', {name: 'Continue'});

            expect(submitButton).not.toBeDisabled();
            expect(submitButton).toHaveTextContent('Continue');
        });

        test('button click is blocked during loading state', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest({action: 'verifyOTC:running'});
            const loadingButton = testUtils.getByRole('button');
            const otcInput = testUtils.getByLabelText(OTC_LABEL_REGEX);

            fireEvent.change(otcInput, {target: {value: '123456'}});
            fireEvent.click(loadingButton);

            expect(mockDoActionFn).not.toHaveBeenCalledWith('verifyOTC', expect.anything());
        });

        test('Enter key submission is blocked during loading state', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest({action: 'verifyOTC:running'});

            fillAndSubmitOTC(testUtils, '123456', 'enter');

            expect(mockDoActionFn).not.toHaveBeenCalledWith('verifyOTC', expect.anything());
        });

        test('validation works during error state', () => {
            const utils = setupOTCTest({action: 'verifyOTC:failed'});
            const submitButton = utils.getByRole('button', {name: 'Continue'});

            fireEvent.click(submitButton);

            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();
        });
    });

    describe('OTC flow edge cases', () => {
        test('does not render form without otcRef', () => {
            const utils = setupTest({
                labs: {},
                otcRef: null
            });

            expect(utils.queryByText(/You can also use the one-time code to sign in here/i)).not.toBeInTheDocument();
            expect(utils.queryByRole('button', {name: 'Continue'})).not.toBeInTheDocument();
            expect(utils.getByRole('button', {name: 'Close'})).toBeInTheDocument();
        });

        test('supports multiple submission attempts with different values', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest();
            const otcInput = testUtils.getByLabelText(OTC_LABEL_REGEX);
            const submitButton = testUtils.getByRole('button', {name: 'Continue'});

            fireEvent.change(otcInput, {target: {value: '111111'}});
            fireEvent.click(submitButton);

            fireEvent.change(otcInput, {target: {value: '222222'}});
            fireEvent.click(submitButton);

            expect(mockDoActionFn).toHaveBeenCalledTimes(2);
            expect(mockDoActionFn).toHaveBeenNthCalledWith(1, 'verifyOTC', {
                otc: '111111',
                otcRef: 'test-otc-ref'
            });
            expect(mockDoActionFn).toHaveBeenNthCalledWith(2, 'verifyOTC', {
                otc: '222222',
                otcRef: 'test-otc-ref'
            });
        });
    });

    describe('redirect parameter handling', () => {
        test('passes redirect parameter from pageData to verifyOTC action', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest({
                pageData: {redirect: 'https://example.com/custom-redirect'}
            });

            fillAndSubmitOTC(testUtils, '123456');

            expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                otc: '123456',
                otcRef: 'test-otc-ref',
                redirect: 'https://example.com/custom-redirect'
            });
        });

        test('verifyOTC action works without redirect parameter', () => {
            const {mockDoActionFn, ...testUtils} = setupOTCTest({
                pageData: {} // no redirect
            });

            fillAndSubmitOTC(testUtils, '123456');

            expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                otc: '123456',
                otcRef: 'test-otc-ref',
                redirect: undefined
            });
        });
    });

    describe('OTC verification error handling', () => {
        test('displays actionErrorMessage message on failed verification', () => {
            const utils = setupOTCTest({
                action: 'verifyOTC:failed',
                actionErrorMessage: 'Invalid verification code'
            });

            expect(utils.getByText('Invalid verification code')).toBeInTheDocument();
        });

        test('actionErrorMessage takes precedence over validation errors', () => {
            const utils = setupOTCTest({
                action: 'verifyOTC:failed',
                actionErrorMessage: 'Server error message'
            });

            const submitButton = utils.getByRole('button', {name: 'Continue'});
            fireEvent.click(submitButton); // triggers validation

            // Should show server error, not validation error
            expect(utils.getByText('Server error message')).toBeInTheDocument();
            expect(utils.queryByText(OTC_ERROR_REGEX)).not.toBeInTheDocument();
        });

        test('applies error styling when actionErrorMessage is present', () => {
            const utils = setupOTCTest({
                action: 'verifyOTC:failed',
                actionErrorMessage: 'Invalid code'
            });

            const otcInput = utils.getByLabelText(OTC_LABEL_REGEX);
            const container = otcInput.parentElement;

            expect(container).toHaveClass('error');
            expect(otcInput).toHaveClass('error');
        });

        test('does not show actionErrorMessage when action is not failed', () => {
            const utils = setupOTCTest({
                action: 'verifyOTC:success',
                actionErrorMessage: 'This should not appear'
            });

            expect(utils.queryByText('This should not appear')).not.toBeInTheDocument();
        });

        test('handles empty actionErrorMessage gracefully', () => {
            const utils = setupOTCTest({
                action: 'verifyOTC:failed',
                actionErrorMessage: '' // empty string
            });

            // Should not crash, and validation error should show if triggered
            const submitButton = utils.getByRole('button', {name: 'Continue'});
            fireEvent.click(submitButton);

            expect(utils.getByText(OTC_ERROR_REGEX)).toBeInTheDocument();
        });

        test('allows retry after actionErrorMessage is displayed', () => {
            const {mockDoActionFn, ...utils} = setupOTCTest({
                action: 'verifyOTC:failed',
                actionErrorMessage: 'Invalid code'
            });

            expect(utils.getByText('Invalid code')).toBeInTheDocument();

            // User corrects code and retries
            fillAndSubmitOTC(utils, '654321');

            expect(mockDoActionFn).toHaveBeenCalledWith('verifyOTC', {
                otc: '654321',
                otcRef: 'test-otc-ref'
            });
        });
    });
});
