import { render, fireEvent } from '@testing-library/react';
import InputField from '../../../../src/components/common/input-field';

const setup = (overrides = {}) => {
  const mockOnChangeFn = vi.fn();
  const props = {
    name: 'test-input',
    label: 'Test Input',
    value: '',
    placeholder: 'Test placeholder',
    onChange: mockOnChangeFn,
    ...overrides,
  };
  const utils = render(<InputField {...props} />);

  const inputEl = utils.getByLabelText(props.label);
  return {
    inputEl,
    mockOnChangeFn,
    ...utils,
  };
};

describe('InputField', () => {
  test('renders', () => {
    const { inputEl } = setup();
    expect(inputEl).toBeInTheDocument();
  });

  test('calls onChange on value', () => {
    const { inputEl, mockOnChangeFn } = setup();
    fireEvent.change(inputEl, { target: { value: 'Test' } });

    expect(mockOnChangeFn).toHaveBeenCalled();
  });

  test('renders a select for the select type, with an empty option for no value', () => {
    const { inputEl, mockOnChangeFn } = setup({
      type: 'select',
      placeholder: 'Country',
      options: [
        { value: 'DE', label: 'Germany' },
        { value: 'FI', label: 'Finland' },
      ],
    });

    expect(inputEl.tagName).toBe('SELECT');
    expect(Array.from(inputEl.options).map((option) => option.textContent)).toEqual([
      'Country',
      'Germany',
      'Finland',
    ]);
    // Nothing chosen reads as a placeholder, without claiming the field is required. The
    // placeholder is what the closed control shows, not a choice, so it cannot be picked
    // and is hidden from the open list where the browser honours that (Safari shows it
    // greyed instead).
    expect(inputEl).toHaveClass('placeholder');
    expect(inputEl).not.toBeRequired();
    expect(inputEl.options[0]).toBeDisabled();
    expect(inputEl.options[0]).toHaveAttribute('hidden');
    fireEvent.change(inputEl, { target: { value: 'FI' } });
    expect(mockOnChangeFn).toHaveBeenCalled();
  });

  test('a select with a value is not styled as a placeholder, and offers a way to clear it', () => {
    const { inputEl, mockOnChangeFn } = setup({
      type: 'select',
      value: 'FI',
      placeholder: 'Country',
      options: [{ value: 'FI', label: 'Finland' }],
    });
    expect(inputEl).not.toHaveClass('placeholder');
    expect(Array.from(inputEl.options).map((option) => option.textContent)).toEqual([
      '(None)',
      'Finland',
    ]);
    expect(inputEl.options[0]).not.toBeDisabled();
    fireEvent.change(inputEl, { target: { value: '' } });
    expect(mockOnChangeFn).toHaveBeenCalled();
  });

  test('renders a textarea for the textarea type, where Enter does not submit', () => {
    const mockOnKeyDownFn = vi.fn();
    const { inputEl, mockOnChangeFn } = setup({ type: 'textarea', onKeyDown: mockOnKeyDownFn });

    expect(inputEl.tagName).toBe('TEXTAREA');
    // Its own class carries the textarea styling, so other textareas with the base class
    // (the gift message, the cancellation reason) are left as they are.
    expect(inputEl).toHaveClass('gh-portal-input', 'gh-portal-input-textarea');
    fireEvent.change(inputEl, { target: { value: 'Two\nlines' } });
    expect(mockOnChangeFn).toHaveBeenCalled();

    fireEvent.keyDown(inputEl, { key: 'Enter', keyCode: 13 });
    expect(mockOnKeyDownFn).not.toHaveBeenCalled();
  });
});
