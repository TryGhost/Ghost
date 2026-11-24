import {
  type ClipboardEvent,
  type KeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { inputSurface } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';

export interface CodeInputHandle {
  /** Empties every box and focuses the first. */
  clear: () => void;
  focus: () => void;
}

const LENGTH = 6;

/**
 * Six one-digit boxes. Typing moves to the next box, Backspace moves back,
 * and pasting a code fills them all. Calls `onComplete` on the sixth digit.
 */
export const CodeInput = forwardRef<
  CodeInputHandle,
  {
    invalid?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    label?: string;
    size?: 'default' | 'lg';
    onChange?: (code: string) => void;
    onComplete: (code: string) => void;
  }
>(function CodeInput(
  {
    invalid,
    disabled,
    autoFocus,
    label = 'Verification code',
    size = 'default',
    onChange,
    onComplete,
  },
  ref,
) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: LENGTH }, () => ''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // The boxes are often disabled while a code is checked, so focus waits until they're enabled.
  const focusWhenEnabled = useRef(false);

  useEffect(() => {
    if (!disabled && focusWhenEnabled.current) {
      focusWhenEnabled.current = false;
      inputs.current[0]?.focus();
    }
  }, [disabled, digits]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      setDigits(Array.from({ length: LENGTH }, () => ''));
      focusWhenEnabled.current = true;
    },
    focus: () => inputs.current[0]?.focus(),
  }));

  const update = (next: string[]) => {
    setDigits(next);
    const code = next.join('');
    onChange?.(code);
    if (code.length === LENGTH && next.every(Boolean)) {
      onComplete(code);
    }
  };

  const setFrom = (index: number, value: string) => {
    const incoming = value.replace(/\D/g, '');
    if (!incoming) {
      const next = [...digits];
      next[index] = '';
      update(next);
      return;
    }
    const next = [...digits];
    let position = index;
    for (const digit of incoming) {
      if (position >= LENGTH) {
        break;
      }
      next[position] = digit;
      position += 1;
    }
    update(next);
    inputs.current[Math.min(position, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      update(next);
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const onPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    setFrom(index, event.clipboardData.getData('text'));
  };

  return (
    <Inline aria-label={label} gap="sm" justify="center" role="group">
      {digits.map((digit, index) => (
        <input
          // The boxes are fixed; their order never changes.
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          aria-invalid={invalid || undefined}
          aria-label={`${label} digit ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          className={cn(
            inputSurface('self'),
            'text-center font-mono tabular-nums',
            size === 'lg' ? 'h-14 w-12 text-2xl!' : 'h-11 w-10 text-xl!',
          )}
          disabled={disabled}
          inputMode="numeric"
          maxLength={LENGTH}
          pattern="[0-9]*"
          type="text"
          value={digit}
          data-1p-ignore
          onChange={(event) => setFrom(index, event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
        />
      ))}
    </Inline>
  );
});
