import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

export interface TimePickerProps extends Omit<ComponentProps<'input'>, 'type' | 'size'> {
  /** Optional trailing context, such as a timezone abbreviation. */
  suffix?: ReactNode;
}

/** Native, keyboard-accessible time input. Values use HH:mm and remain consumer-owned. */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { className, suffix, disabled, step = 60, ...props },
  ref,
) {
  return (
    <InputGroup className={cn('min-w-0', className)} data-disabled={disabled}>
      <InputGroupAddon>
        <Clock aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        ref={ref}
        className="min-w-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        disabled={disabled}
        step={step}
        type="time"
        {...props}
      />
      {suffix ? (
        <InputGroupAddon align="inline-end" className="text-sm font-normal">
          {suffix}
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
});
