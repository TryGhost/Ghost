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
