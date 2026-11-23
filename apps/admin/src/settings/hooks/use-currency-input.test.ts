import { act, renderHook } from '@testing-library/react';
import useCurrencyInput from '@/settings/hooks/use-currency-input';

/** Renders the hook the way forms use it: '' for zero, cents fed back on change. */
const renderCurrencyInput = (initialCents: number) => {
  let cents = initialCents;
  const onChange = vi.fn((next: number) => {
    cents = next;
  });
  const hook = renderHook(({ value }) => useCurrencyInput(value || '', onChange), {
    initialProps: { value: initialCents },
  });
  const type = (input: string) => {
    act(() => hook.result.current.onChange(input));
    hook.rerender({ value: cents });
  };
  /** Types one key at a time onto whatever the field shows, like a keyboard. */
  const typeKeys = (keys: string) => {
    for (const key of keys) {
      type(hook.result.current.value + key);
    }
  };
  return { hook, onChange, type, typeKeys };
};

describe('useCurrencyInput', () => {
  it('shows whole amounts without decimals', () => {
    const { hook } = renderCurrencyInput(500);
    expect(hook.result.current.value).toBe('5');
  });

  it('keeps two decimals when the amount has cents', () => {
    expect(renderCurrencyInput(990).hook.result.current.value).toBe('9.90');
    expect(renderCurrencyInput(150).hook.result.current.value).toBe('1.50');
  });

  it('leaves an empty field empty', () => {
    expect(renderCurrencyInput(0).hook.result.current.value).toBe('');
  });

  it('lets a trailing zero be typed and emits cents', () => {
    const { hook, onChange, type } = renderCurrencyInput(0);
    type('1.5');
    type('1.50');
    expect(hook.result.current.value).toBe('1.50');
    expect(onChange).toHaveBeenLastCalledWith(150);
  });

  it('keeps a typed zero while the rest of the amount is entered', () => {
    const { hook, type } = renderCurrencyInput(0);
    type('0');
    expect(hook.result.current.value).toBe('0');
    type('0.');
    expect(hook.result.current.value).toBe('0.');
  });

  it('keeps a typed zero when it replaces an existing amount', () => {
    const { hook, type } = renderCurrencyInput(500);
    type('0');
    expect(hook.result.current.value).toBe('0');
    type('0.');
    expect(hook.result.current.value).toBe('0.');
  });

  it('saves the amount the field shows when a formatted amount is pasted', () => {
    const { hook, onChange, type } = renderCurrencyInput(0);
    type('1,000.50');
    expect(hook.result.current.value).toBe('1000.50');
    expect(onChange).toHaveBeenLastCalledWith(100050);
  });

  it('treats comma-decimal input as cents', () => {
    const { hook, onChange, typeKeys } = renderCurrencyInput(0);
    typeKeys('9,90');
    expect(hook.result.current.value).toBe('9,90');
    expect(onChange).toHaveBeenLastCalledWith(990);
    act(() => hook.result.current.onBlur());
    expect(hook.result.current.value).toBe('9.90');
  });

  it.each([
    ['1,000', '1000', 100000],
    ['12,500', '12500', 1250000],
    ['1,000.50', '1000.50', 100050],
  ])('reads %s typed key by key as thousands', (keys, shown, cents) => {
    const { hook, onChange, typeKeys } = renderCurrencyInput(0);
    typeKeys(keys);
    expect(hook.result.current.value).toBe(shown);
    expect(onChange).toHaveBeenLastCalledWith(cents);
  });

  it('reads a leading decimal point as cents', () => {
    const { hook, onChange, type } = renderCurrencyInput(0);
    type('.5');
    expect(onChange).toHaveBeenLastCalledWith(50);
    act(() => hook.result.current.onBlur());
    expect(hook.result.current.value).toBe('0.50');
  });

  it('leaves an untouched empty field empty on blur', () => {
    const { hook } = renderCurrencyInput(0);
    act(() => hook.result.current.onBlur());
    expect(hook.result.current.value).toBe('');
  });

  it('pads cents to two decimals on blur', () => {
    const { hook, type } = renderCurrencyInput(0);
    type('9.9');
    act(() => hook.result.current.onBlur());
    expect(hook.result.current.value).toBe('9.90');
  });

  it('drops digits after the second decimal place immediately', () => {
    const { hook, onChange, type } = renderCurrencyInput(0);
    type('1.159');
    expect(onChange).toHaveBeenLastCalledWith(115);
    expect(hook.result.current.value).toBe('1.15');
  });

  it('shows a new amount passed in from outside', () => {
    const { hook } = renderCurrencyInput(500);
    hook.rerender({ value: 1250 });
    expect(hook.result.current.value).toBe('12.50');
  });
});
