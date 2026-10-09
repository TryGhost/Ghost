import React, { useId, useState } from 'react';
import {
  Field,
  FieldLabel,
  FieldError,
  InputGroup,
  InputGroupInput,
  InputGroupText,
  InputGroupAddon,
  InputGroupButton,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';

const MAX_WAIT_DAYS = 30;
export const WAIT_VALIDATION_MESSAGE = 'Enter a wait between 1 and 30 days.';
const WHOLE_NUMBER_PATTERN = /^\d+$/;
const NON_DIGITS_PATTERN = /\D/g;
const LEADING_ZEROS_PATTERN = /^0+/;

const getValidWaitDays = (value: string): number | null => {
  const days = Number(value);
  if (
    !WHOLE_NUMBER_PATTERN.test(value) ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > MAX_WAIT_DAYS
  ) {
    return null;
  }
  return days;
};

export const WaitDurationField: React.FC<{
  waitHours: number;
  onUpdate: (hours: number) => void;
  inline?: boolean;
  onValidityChange?: (valid: boolean) => void;
  onErrorVisibilityChange?: (visible: boolean) => void;
}> = ({ waitHours, onUpdate, inline = false, onValidityChange, onErrorVisibilityChange }) => {
  const fieldId = useId();
  const inputId = inline ? fieldId : 'automation-wait-days';
  const errorId = `${inputId}-error`;
  const unitId = `${inputId}-unit`;
  if (waitHours % 24 !== 0) {
    throw new Error(
      `WaitDurationField: wait_hours must be a multiple of 24, received ${waitHours}`,
    );
  }
  const initialDays = waitHours / 24;
  const [daysText, setDaysText] = useState<string>(String(initialDays));
  const [hasBlurredDaysInput, setHasBlurredDaysInput] = useState(false);
  // Shown on blur and cleared once valid; validity itself is still reported on every change.
  const [isInlineErrorVisible, setIsInlineErrorVisible] = useState(false);
  const showInlineError = (visible: boolean) => {
    setIsInlineErrorVisible(visible);
    onErrorVisibilityChange?.(visible);
  };

  const days = Number(daysText);
  const isValid = getValidWaitDays(daysText) !== null;
  const showValidationError = hasBlurredDaysInput && !isValid;
  const updateWaitDays = (nextDays: number) => {
    const nextHours = nextDays * 24;
    if (nextHours !== waitHours) {
      onUpdate(nextHours);
    }
  };

  const stepWaitDays = (direction: -1 | 1) => {
    const currentDays = getValidWaitDays(daysText);
    if (currentDays === null) {
      return;
    }

    const nextDays = Math.min(MAX_WAIT_DAYS, Math.max(1, currentDays + direction));
    setDaysText(String(nextDays));
    updateWaitDays(nextDays);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Waits are whole days from 1, so non-digits and leading zeros are dropped as they're typed.
    const nextDaysText = event.target.value
      .replace(NON_DIGITS_PATTERN, '')
      .replace(LEADING_ZEROS_PATTERN, '');
    setDaysText(nextDaysText);

    const nextDays = getValidWaitDays(nextDaysText);
    onValidityChange?.(nextDays !== null);
    if (nextDays === null) {
      return;
    }
    showInlineError(false);
    updateWaitDays(nextDays);
  };

  return (
    <Stack gap="sm">
      <Field>
        <FieldLabel
          className={inline ? 'sr-only' : 'text-sm font-medium text-text-secondary'}
          htmlFor={inputId}
        >
          Wait for
        </FieldLabel>
        {inline ? (
          <InputGroup>
            <InputGroupInput
              aria-describedby={isInlineErrorVisible ? `${unitId} ${errorId}` : unitId}
              aria-invalid={isInlineErrorVisible}
              id={inputId}
              inputMode="numeric"
              value={daysText}
              onBlur={() => showInlineError(!isValid)}
              onChange={handleChange}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText id={unitId}>{days === 1 ? 'Day' : 'Days'}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <InputGroup
            aria-label="Wait duration in days"
            className="h-(--control-height)"
            data-disabled={showValidationError ? 'true' : undefined}
          >
            <InputGroupInput
              aria-describedby={showValidationError ? errorId : undefined}
              aria-invalid={showValidationError}
              className="w-10 min-w-10 flex-none pr-1 font-mono tabular-nums"
              id={inputId}
              inputMode="numeric"
              value={daysText}
              onBlur={() => setHasBlurredDaysInput(true)}
              onChange={handleChange}
              onFocus={() => setHasBlurredDaysInput(false)}
            />
            <InputGroupText className="mr-auto">{days === 1 ? 'day' : 'days'}</InputGroupText>
            <InputGroupAddon align="inline-end" className="gap-0.5 pr-2">
              <InputGroupButton
                aria-label="Decrease wait by one day"
                disabled={!isValid || days <= 1}
                size="icon-xs"
                title="Decrease wait by one day"
                onClick={() => stepWaitDays(-1)}
              >
                <LucideIcon.Minus className="size-4" />
              </InputGroupButton>
              <InputGroupButton
                aria-label="Increase wait by one day"
                disabled={!isValid || days >= MAX_WAIT_DAYS}
                size="icon-xs"
                title="Increase wait by one day"
                onClick={() => stepWaitDays(1)}
              >
                <LucideIcon.Plus className="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        )}
        {inline && isInlineErrorVisible && (
          <span className="sr-only" id={errorId}>
            {WAIT_VALIDATION_MESSAGE}
          </span>
        )}
        {!inline && showValidationError && (
          <FieldError className="text-xs" id={errorId}>
            Enter a delay between 1 and {formatNumber(MAX_WAIT_DAYS)} days
          </FieldError>
        )}
      </Field>
    </Stack>
  );
};
