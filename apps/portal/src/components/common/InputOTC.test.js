import {render, fireEvent} from '../../utils/test-utils';
import {REGEXP_ONLY_DIGITS} from 'input-otp';
import {InputOTC, InputOTCGroup, InputOTCSlot} from './InputOTC';

const renderOtc = (uiProps = {}) => {
    const utils = render(
        <InputOTC
            maxLength={6}
            value={uiProps.value ?? ''}
            onChange={uiProps.onChange ?? (() => {})}
            pattern={uiProps.pattern}
            name={uiProps.name || 'otc'}
            id={uiProps.id || 'input-otc'}
            label={uiProps.label || 'Code'}
            hasError={uiProps.hasError}
        >
            <InputOTCGroup>
                {Array.from({length: 6}, (_, i) => (
                    <InputOTCSlot key={i} index={i} />
                ))}
            </InputOTCGroup>
        </InputOTC>
    );
    return utils;
};

describe('InputOTC', () => {
    test('renders expected structure', () => {
        const utils = renderOtc();

        // Underlying input
        expect(utils.getByRole('textbox')).toHaveAttribute('data-slot', 'input-otc');
        // Group and slots
        expect(utils.getByTestId ? true : true).toBeTruthy(); // noop to use utils
        expect(utils.container.querySelectorAll('[data-slot="input-otc-group"]').length).toBe(1);
        expect(utils.container.querySelectorAll('[data-slot="input-otc-slot"]').length).toBe(6);
    });

    test('displays provided value across slots', () => {
        const utils = renderOtc({value: '13579'});
        const slots = Array.from(utils.container.querySelectorAll('[data-slot="input-otc-slot"]'));
        const contents = slots.map(el => el.textContent || '');
        expect(contents.slice(0, 5)).toEqual(['1', '3', '5', '7', '9']);
        expect(contents[5]).toBe('');
    });

    test('calls onChange when typing', () => {
        const handleChange = jest.fn();
        const utils = renderOtc({onChange: handleChange, pattern: REGEXP_ONLY_DIGITS});
        const input = utils.getByRole('textbox');

        fireEvent.change(input, {target: {value: '1234'}});

        expect(handleChange).toHaveBeenCalled();
        const lastArg = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
        expect(lastArg).toBe('1234');
    });

    test('sets parent invalid attributes when hasError', () => {
        const utils = renderOtc({hasError: true});
        const input = utils.getByRole('textbox');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('data-invalid', 'true');
    });
});

